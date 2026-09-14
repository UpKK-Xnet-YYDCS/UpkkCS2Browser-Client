use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::net::UdpSocket;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tokio::sync::{Mutex as AsyncMutex, Semaphore};

const A2S_INFO: [u8; 25] = [
    0xFF, 0xFF, 0xFF, 0xFF, 0x54, 0x53, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x20, 0x45, 0x6e, 0x67, 0x69,
    0x6e, 0x65, 0x20, 0x51, 0x75, 0x65, 0x72, 0x79, 0x00,
];
const DEFAULT_BATCH_CONCURRENCY: usize = 3;
const MAX_BATCH_CONCURRENCY: usize = 6;
const GLOBAL_A2S_LIMIT: usize = 6;

static GLOBAL_A2S_LIMITER: OnceLock<Arc<Semaphore>> = OnceLock::new();

fn global_a2s_limiter() -> Arc<Semaphore> {
    GLOBAL_A2S_LIMITER
        .get_or_init(|| Arc::new(Semaphore::new(GLOBAL_A2S_LIMIT)))
        .clone()
}

fn batch_concurrency(concurrency: Option<usize>) -> usize {
    concurrency
        .unwrap_or(DEFAULT_BATCH_CONCURRENCY)
        .clamp(1, MAX_BATCH_CONCURRENCY)
}

#[derive(Serialize, Clone, Debug, Default, PartialEq)]
pub struct A2SQueryResult {
    pub success: bool,
    pub error: Option<String>,
    pub ip: String,
    pub port: String,
    pub name: String,
    pub map_name: String,
    pub game: String,
    pub players: i32,
    pub max_players: i32,
    pub bots: i32,
    pub real_players: i32,
    pub server_type: String,
    pub environment: String,
    pub password: bool,
    pub vac: bool,
    pub version: String,
    pub latency_ms: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub queue_wait_ms: Option<u64>,
}

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct A2SQueryTarget {
    pub ip: String,
    pub port: String,
    pub timeout_ms: Option<u64>,
}

fn failed_result(ip: &str, port: &str, error: impl Into<String>) -> A2SQueryResult {
    A2SQueryResult {
        ip: ip.to_string(),
        port: port.to_string(),
        error: Some(error.into()),
        ..Default::default()
    }
}

fn read_cstring(data: &[u8], start: usize) -> Result<(String, usize), String> {
    if start >= data.len() {
        return Err("Response ended before string field".to_string());
    }
    let relative_end = data[start..]
        .iter()
        .position(|byte| *byte == 0)
        .ok_or_else(|| "Unterminated string field".to_string())?;
    let end = start + relative_end;
    Ok((
        String::from_utf8_lossy(&data[start..end]).into_owned(),
        end + 1,
    ))
}

fn clamp_a2s_timeout(timeout_ms: Option<u64>) -> Duration {
    Duration::from_millis(timeout_ms.unwrap_or(2_000).clamp(500, 5_000))
}

fn elapsed_millis(started_at: Instant) -> u64 {
    started_at.elapsed().as_millis().min(u64::MAX as u128) as u64
}

fn parse_a2s_info(
    data: &[u8],
    ip: &str,
    port: &str,
    latency_ms: u64,
) -> Result<A2SQueryResult, String> {
    if data.len() < 6 {
        return Err("Response too short".to_string());
    }
    if data[..4] != [0xFF, 0xFF, 0xFF, 0xFF] {
        return Err("Invalid response header".to_string());
    }
    if data[4] != 0x49 {
        return Err(format!("Invalid response type: 0x{:02X}", data[4]));
    }

    let mut pos = 6;
    let (name, next_pos) = read_cstring(data, pos)?;
    pos = next_pos;
    let (map_name, next_pos) = read_cstring(data, pos)?;
    pos = next_pos;
    let (_, next_pos) = read_cstring(data, pos)?;
    pos = next_pos;
    let (game, next_pos) = read_cstring(data, pos)?;
    pos = next_pos;

    if pos + 2 + 3 > data.len() {
        return Err("Response ended before player fields".to_string());
    }
    pos += 2;
    let mut players = data[pos] as i32;
    let mut max_players = data[pos + 1] as i32;
    let mut bots = data[pos + 2] as i32;
    pos += 3;

    let server_type = data
        .get(pos)
        .map_or_else(String::new, |value| match *value {
            b'd' => "dedicated".to_string(),
            b'l' => "non-dedicated".to_string(),
            b'p' => "sourcetv".to_string(),
            other => (other as char).to_string(),
        });
    pos += usize::from(pos < data.len());
    let environment = data
        .get(pos)
        .map_or_else(String::new, |value| match *value {
            b'l' => "Linux".to_string(),
            b'w' => "Windows".to_string(),
            b'm' | b'o' => "Mac".to_string(),
            other => (other as char).to_string(),
        });
    pos += usize::from(pos < data.len());
    let password = data.get(pos).is_some_and(|value| *value != 0);
    pos += usize::from(pos < data.len());
    let vac = data.get(pos).is_some_and(|value| *value != 0);
    pos += usize::from(pos < data.len());
    let version = if pos < data.len() {
        read_cstring(data, pos)
            .map(|(value, _)| value)
            .unwrap_or_default()
    } else {
        String::new()
    };

    if max_players > 67 {
        players = 0;
        max_players = 0;
        bots = 0;
    }

    Ok(A2SQueryResult {
        success: true,
        error: None,
        ip: ip.to_string(),
        port: port.to_string(),
        name,
        map_name,
        game,
        players,
        max_players,
        bots,
        real_players: (players - bots).max(0),
        server_type,
        environment,
        password,
        vac,
        version,
        latency_ms: Some(latency_ms),
        queue_wait_ms: None,
    })
}

fn a2s_query(ip: &str, port: &str, timeout_ms: Option<u64>) -> A2SQueryResult {
    let address = format!("{ip}:{port}");
    let socket = match UdpSocket::bind("0.0.0.0:0") {
        Ok(socket) => socket,
        Err(error) => return failed_result(ip, port, format!("Failed to create socket: {error}")),
    };
    if let Err(error) = socket.set_read_timeout(Some(clamp_a2s_timeout(timeout_ms))) {
        return failed_result(ip, port, format!("Failed to set timeout: {error}"));
    }
    if let Err(error) = socket.connect(&address) {
        return failed_result(ip, port, format!("Failed to connect: {error}"));
    }

    let started_at = Instant::now();
    if let Err(error) = socket.send(&A2S_INFO) {
        return failed_result(ip, port, format!("Failed to send query: {error}"));
    }

    let mut buffer = [0u8; 1400];
    let first_len = match socket.recv(&mut buffer) {
        Ok(length) => length,
        Err(error) => return failed_result(ip, port, format!("Failed to receive: {error}")),
    };
    let latency_ms = elapsed_millis(started_at);
    if first_len < 6 {
        return failed_result(ip, port, "Response too short");
    }

    let response_len = if buffer[4] == 0x41 && first_len >= 9 {
        let challenge = u32::from_le_bytes([buffer[5], buffer[6], buffer[7], buffer[8]]);
        let mut request = [0u8; 29];
        request[..A2S_INFO.len()].copy_from_slice(&A2S_INFO);
        request[A2S_INFO.len()..].copy_from_slice(&challenge.to_le_bytes());
        if let Err(error) = socket.send(&request) {
            return failed_result(ip, port, format!("Failed to send challenge: {error}"));
        }
        match socket.recv(&mut buffer) {
            Ok(length) => length,
            Err(error) => {
                return failed_result(
                    ip,
                    port,
                    format!("Failed to receive after challenge: {error}"),
                )
            }
        }
    } else {
        first_len
    };

    parse_a2s_info(&buffer[..response_len], ip, port, latency_ms)
        .unwrap_or_else(|error| failed_result(ip, port, error))
}

async fn run_blocking_a2s<T, F>(work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce(u64) -> T + Send + 'static,
{
    let queued_at = Instant::now();
    let permit = global_a2s_limiter()
        .acquire_owned()
        .await
        .expect("global A2S limiter must remain open");
    let queue_wait_ms = elapsed_millis(queued_at);
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        work(queue_wait_ms)
    })
    .await
    .map_err(|error| format!("Query task failed: {error}"))
}

fn attach_queue_wait(mut result: A2SQueryResult, queue_wait_ms: u64) -> A2SQueryResult {
    result.queue_wait_ms = Some(queue_wait_ms);
    result
}

async fn query_targets_with<F>(
    targets: Vec<A2SQueryTarget>,
    concurrency: Option<usize>,
    query: F,
) -> Vec<A2SQueryResult>
where
    F: Fn(A2SQueryTarget) -> A2SQueryResult + Send + Sync + 'static,
{
    let total = targets.len();
    if total == 0 {
        return Vec::new();
    }

    let worker_count = batch_concurrency(concurrency).min(total);
    let query = Arc::new(query);
    let fallbacks: Vec<(String, String)> = targets
        .iter()
        .map(|target| (target.ip.clone(), target.port.clone()))
        .collect();
    let jobs = Arc::new(AsyncMutex::new(
        targets.into_iter().enumerate().collect::<VecDeque<_>>(),
    ));
    let slots: Arc<Mutex<Vec<Option<A2SQueryResult>>>> =
        Arc::new(Mutex::new((0..total).map(|_| None).collect()));

    let mut workers = Vec::with_capacity(worker_count);
    for _ in 0..worker_count {
        let jobs = Arc::clone(&jobs);
        let query = Arc::clone(&query);
        let slots = Arc::clone(&slots);
        workers.push(tokio::spawn(async move {
            loop {
                let job = { jobs.lock().await.pop_front() };
                let Some((index, target)) = job else {
                    break;
                };
                let fallback_ip = target.ip.clone();
                let fallback_port = target.port.clone();
                let query = Arc::clone(&query);
                let outcome = run_blocking_a2s(move |queue_wait_ms| {
                    attach_queue_wait(query(target), queue_wait_ms)
                })
                .await
                .unwrap_or_else(|error| failed_result(&fallback_ip, &fallback_port, error));
                slots.lock().expect("a2s result slots")[index] = Some(outcome);
            }
        }));
    }

    for worker in workers {
        let _ = worker.await;
    }

    let mut slots = Arc::try_unwrap(slots)
        .unwrap_or_else(|slots| {
            Mutex::new(slots.lock().map(|guard| guard.clone()).unwrap_or_default())
        })
        .into_inner()
        .unwrap_or_default();
    slots
        .iter_mut()
        .enumerate()
        .map(|(index, slot)| {
            slot.take().unwrap_or_else(|| {
                let (ip, port) = &fallbacks[index];
                failed_result(ip, port, "Query task failed")
            })
        })
        .collect()
}

#[tauri::command]
pub async fn query_server_a2s(
    ip: String,
    port: String,
    timeout_ms: Option<u64>,
) -> Result<A2SQueryResult, String> {
    let fallback_ip = ip.clone();
    let fallback_port = port.clone();
    run_blocking_a2s(move |queue_wait_ms| {
        attach_queue_wait(a2s_query(&ip, &port, timeout_ms), queue_wait_ms)
    })
    .await
    .map_err(|error| format!("Query task failed for {fallback_ip}:{fallback_port}: {error}"))
}

#[tauri::command]
pub async fn query_servers_a2s(
    targets: Vec<A2SQueryTarget>,
    concurrency: Option<usize>,
) -> Result<Vec<A2SQueryResult>, String> {
    Ok(query_targets_with(targets, concurrency, |target| {
        a2s_query(&target.ip, &target.port, target.timeout_ms)
    })
    .await)
}

#[cfg(test)]
mod tests;
