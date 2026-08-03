use serde::{Deserialize, Serialize};
use std::net::UdpSocket;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Semaphore;

const A2S_INFO: [u8; 25] = [
    0xFF, 0xFF, 0xFF, 0xFF, 0x54, 0x53, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x20, 0x45, 0x6e, 0x67, 0x69,
    0x6e, 0x65, 0x20, 0x51, 0x75, 0x65, 0x72, 0x79, 0x00,
];
const DEFAULT_BATCH_CONCURRENCY: usize = 3;
const MAX_BATCH_CONCURRENCY: usize = 6;

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

async fn query_targets_with<F>(
    targets: Vec<A2SQueryTarget>,
    concurrency: Option<usize>,
    query: F,
) -> Vec<A2SQueryResult>
where
    F: Fn(A2SQueryTarget) -> A2SQueryResult + Send + Sync + 'static,
{
    let worker_count = batch_concurrency(concurrency);
    let semaphore = Arc::new(Semaphore::new(worker_count));
    let query = Arc::new(query);
    let mut handles = Vec::with_capacity(targets.len());

    for target in targets {
        let fallback_ip = target.ip.clone();
        let fallback_port = target.port.clone();
        let permit = semaphore
            .clone()
            .acquire_owned()
            .await
            .expect("batch semaphore must remain open");
        let query = Arc::clone(&query);
        let handle = tokio::task::spawn_blocking(move || {
            let _permit = permit;
            query(target)
        });
        handles.push((fallback_ip, fallback_port, handle));
    }

    let mut results = Vec::with_capacity(handles.len());
    for (ip, port, handle) in handles {
        results.push(handle.await.unwrap_or_else(|error| {
            failed_result(&ip, &port, format!("Query task failed: {error}"))
        }));
    }
    results
}

#[tauri::command]
pub async fn query_server_a2s(
    ip: String,
    port: String,
    timeout_ms: Option<u64>,
) -> Result<A2SQueryResult, String> {
    let fallback_ip = ip.clone();
    let fallback_port = port.clone();
    tokio::task::spawn_blocking(move || a2s_query(&ip, &port, timeout_ms))
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
