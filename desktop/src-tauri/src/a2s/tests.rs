use super::resolve::resolve_limit_permits;
use super::*;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::thread;

fn sample_packet() -> Vec<u8> {
    let mut packet = vec![0xFF, 0xFF, 0xFF, 0xFF, 0x49, 0x11];
    for value in ["Example", "de_dust2", "csgo", "Counter-Strike 2"] {
        packet.extend_from_slice(value.as_bytes());
        packet.push(0);
    }
    packet.extend_from_slice(&[0xDA, 0x02, 12, 24, 2, b'd', b'l', 0, 1]);
    packet.extend_from_slice(b"1.0.0\0");
    packet
}

fn runtime() -> tokio::runtime::Runtime {
    tokio::runtime::Builder::new_multi_thread()
        .worker_threads(2)
        .enable_all()
        .build()
        .unwrap()
}

async fn no_lookup(_ip: String, _port: String) -> ResolvedAddresses {
    Ok(Vec::new())
}

fn resolve_now(ip: &str, port: &str) -> ResolvedAddresses {
    runtime().block_on(resolve_a2s_address(ip.to_string(), port.to_string()))
}

/// Answers one plain (challenge-free) A2S_INFO request on 127.0.0.1.
fn spawn_info_responder() -> (u16, thread::JoinHandle<()>) {
    let server = UdpSocket::bind("127.0.0.1:0").unwrap();
    server
        .set_read_timeout(Some(Duration::from_secs(2)))
        .unwrap();
    let port = server.local_addr().unwrap().port();
    let responder = thread::spawn(move || {
        let mut request = [0u8; 64];
        let (_, client) = server.recv_from(&mut request).unwrap();
        assert_eq!(&request[..A2S_INFO.len()], &A2S_INFO);
        server.send_to(&sample_packet(), client).unwrap();
    });
    (port, responder)
}

#[test]
fn parses_complete_info_packet() {
    let result = parse_a2s_info(&sample_packet(), "127.0.0.1", "27015", 17).unwrap();
    assert!(result.success);
    assert_eq!(result.name, "Example");
    assert_eq!(result.map_name, "de_dust2");
    assert_eq!(result.players, 12);
    assert_eq!(result.real_players, 10);
    assert_eq!(result.latency_ms, Some(17));
}

#[test]
fn rejects_truncated_and_invalid_packets() {
    assert!(parse_a2s_info(&[0xFF; 5], "x", "1", 0).is_err());
    let mut invalid = sample_packet();
    invalid[0] = 0;
    assert!(parse_a2s_info(&invalid, "x", "1", 0).is_err());
    let mut unterminated = sample_packet();
    unterminated.truncate(10);
    assert!(parse_a2s_info(&unterminated, "x", "1", 0).is_err());
}

#[test]
fn completes_challenge_response_exchange() {
    let server = UdpSocket::bind("127.0.0.1:0").unwrap();
    server
        .set_read_timeout(Some(Duration::from_secs(1)))
        .unwrap();
    let address = server.local_addr().unwrap();
    let responder = thread::spawn(move || {
        let mut request = [0u8; 64];
        let (_, client) = server.recv_from(&mut request).unwrap();
        assert_eq!(&request[..A2S_INFO.len()], &A2S_INFO);
        let challenge = [0x12, 0x34, 0x56, 0x78];
        let mut response = vec![0xFF, 0xFF, 0xFF, 0xFF, 0x41];
        response.extend_from_slice(&challenge);
        server.send_to(&response, client).unwrap();

        let (length, client) = server.recv_from(&mut request).unwrap();
        assert_eq!(length, A2S_INFO.len() + challenge.len());
        assert_eq!(&request[A2S_INFO.len()..length], &challenge);
        server.send_to(&sample_packet(), client).unwrap();
    });

    let port = address.port().to_string();
    let resolved = resolve_now("127.0.0.1", &port);
    let result = a2s_query("127.0.0.1", &port, Some(1_000), resolved);
    responder.join().unwrap();
    assert!(result.success, "{:?}", result.error);
    assert_eq!(result.map_name, "de_dust2");
}

#[test]
fn batch_limits_concurrency_and_preserves_input_order() {
    let active = Arc::new(AtomicUsize::new(0));
    let maximum = Arc::new(AtomicUsize::new(0));
    let targets = (0..6)
        .map(|index| A2SQueryTarget {
            ip: format!("host-{index}"),
            port: "27015".to_string(),
            timeout_ms: None,
        })
        .collect();
    let results = runtime().block_on(query_targets_with(targets, Some(2), no_lookup, {
        let active = Arc::clone(&active);
        let maximum = Arc::clone(&maximum);
        move |target, _resolved| {
            let current = active.fetch_add(1, Ordering::SeqCst) + 1;
            maximum.fetch_max(current, Ordering::SeqCst);
            let index = target
                .ip
                .rsplit('-')
                .next()
                .unwrap()
                .parse::<u64>()
                .unwrap();
            thread::sleep(Duration::from_millis(8 - index));
            active.fetch_sub(1, Ordering::SeqCst);
            A2SQueryResult {
                success: true,
                ip: target.ip,
                port: target.port,
                ..Default::default()
            }
        }
    }));

    assert_eq!(maximum.load(Ordering::SeqCst), 2);
    assert_eq!(
        results
            .into_iter()
            .map(|result| result.ip)
            .collect::<Vec<_>>(),
        (0..6)
            .map(|index| format!("host-{index}"))
            .collect::<Vec<_>>()
    );
}

#[test]
fn batch_concurrency_defaults_to_three_and_clamps_to_supported_range() {
    assert_eq!(batch_concurrency(None), 3);
    assert_eq!(batch_concurrency(Some(0)), 1);
    assert_eq!(batch_concurrency(Some(4)), 4);
    assert_eq!(batch_concurrency(Some(99)), 6);
}

#[test]
fn batch_returns_failure_placeholder_when_a_query_task_panics() {
    let targets = vec![A2SQueryTarget {
        ip: "panic-host".to_string(),
        port: "27015".to_string(),
        timeout_ms: None,
    }];
    let results = runtime().block_on(query_targets_with(targets, None, no_lookup, |_, _| {
        panic!("simulated query failure")
    }));
    assert_eq!(results.len(), 1);
    assert!(!results[0].success);
    assert_eq!(results[0].ip, "panic-host");
    assert!(results[0]
        .error
        .as_deref()
        .unwrap()
        .contains("Query task failed"));
}

#[test]
fn mixed_batches_share_the_process_wide_a2s_limit() {
    let active = Arc::new(AtomicUsize::new(0));
    let maximum = Arc::new(AtomicUsize::new(0));
    let make_query = || {
        let active = Arc::clone(&active);
        let maximum = Arc::clone(&maximum);
        move |target: A2SQueryTarget, _resolved: ResolvedAddresses| {
            let current = active.fetch_add(1, Ordering::SeqCst) + 1;
            maximum.fetch_max(current, Ordering::SeqCst);
            thread::sleep(Duration::from_millis(15));
            active.fetch_sub(1, Ordering::SeqCst);
            A2SQueryResult {
                success: true,
                ip: target.ip,
                port: target.port,
                ..Default::default()
            }
        }
    };
    let first_targets = (0..8)
        .map(|index| A2SQueryTarget {
            ip: format!("batch-a-{index}"),
            port: "27015".to_string(),
            timeout_ms: None,
        })
        .collect();
    let second_targets = (0..8)
        .map(|index| A2SQueryTarget {
            ip: format!("batch-b-{index}"),
            port: "27015".to_string(),
            timeout_ms: None,
        })
        .collect();

    runtime().block_on(async {
        let first = query_targets_with(first_targets, Some(6), no_lookup, make_query());
        let second = query_targets_with(second_targets, Some(6), no_lookup, make_query());
        let (first_results, second_results) = tokio::join!(first, second);
        assert_eq!(first_results.len(), 8);
        assert_eq!(second_results.len(), 8);
        assert!(first_results.iter().all(|result| result.success));
        assert!(second_results.iter().all(|result| result.success));
        assert!(first_results
            .iter()
            .chain(second_results.iter())
            .all(|result| result.queue_wait_ms.is_some()));
    });

    assert!(
        maximum.load(Ordering::SeqCst) <= 6,
        "observed A2S concurrency {}",
        maximum.load(Ordering::SeqCst)
    );
    assert_eq!(active.load(Ordering::SeqCst), 0);
}

fn legacy_connect_error(ip: &str, port: &str) -> String {
    let socket = UdpSocket::bind("0.0.0.0:0").unwrap();
    let error = socket
        .connect(format!("{ip}:{port}"))
        .expect_err("legacy connect should fail");
    format!("Failed to connect: {error}")
}

#[test]
fn resolution_failures_keep_the_previous_connect_error() {
    for (ip, port) in [("127.0.0.1", "notaport"), ("127.0.0.1", "70000"), ("", "")] {
        let resolved = resolve_now(ip, port);
        assert!(resolved.is_err(), "{ip}:{port}");
        let result = a2s_query(ip, port, Some(500), resolved);
        assert!(!result.success);
        assert_eq!((result.ip.as_str(), result.port.as_str()), (ip, port));
        assert_eq!(result.error, Some(legacy_connect_error(ip, port)));
    }
    let socket = UdpSocket::bind("0.0.0.0:0").unwrap();
    let empty: &[SocketAddr] = &[];
    let legacy_empty = socket.connect(empty).unwrap_err().to_string();
    let result = a2s_query("x", "1", Some(500), Ok(Vec::new()));
    assert_eq!(
        result.error,
        Some(format!("Failed to connect: {legacy_empty}"))
    );
}

#[test]
fn socket_address_literals_resolve_inline_like_connect() {
    assert_eq!(
        resolve_now("127.0.0.1", "27015").unwrap(),
        vec![SocketAddr::from(([127, 0, 0, 1], 27015))]
    );
    assert_eq!(
        resolve_now("[::1]", "27015").unwrap(),
        vec!["[::1]:27015".parse::<SocketAddr>().unwrap()]
    );
}

#[test]
fn hostname_batches_resolve_first_and_keep_order_with_failure_placeholders() {
    let (port, responder) = spawn_info_responder();
    let targets = vec![
        A2SQueryTarget {
            ip: "localhost".to_string(),
            port: port.to_string(),
            timeout_ms: Some(2_000),
        },
        A2SQueryTarget {
            ip: "127.0.0.1".to_string(),
            port: "notaport".to_string(),
            timeout_ms: None,
        },
    ];
    let results = runtime()
        .block_on(query_servers_a2s(targets, Some(2)))
        .unwrap();
    responder.join().unwrap();

    assert_eq!(results.len(), 2);
    // "localhost" may resolve to [::1] first; like connect-by-string, the
    // IPv4 socket falls through to 127.0.0.1.
    assert!(results[0].success, "{:?}", results[0].error);
    assert_eq!(results[0].ip, "localhost");
    assert_eq!(results[0].map_name, "de_dust2");
    assert!(!results[1].success);
    assert_eq!(
        results[1].error,
        Some(legacy_connect_error("127.0.0.1", "notaport"))
    );
    assert!(results.iter().all(|result| result.queue_wait_ms.is_some()));
}

#[test]
fn hostname_lookups_are_bounded_but_literals_never_wait() {
    let (limiter, limit) = resolve_limit_permits();
    runtime().block_on(async {
        let held = limiter.acquire_many_owned(limit as u32).await.unwrap();
        let literal = tokio::time::timeout(
            Duration::from_secs(2),
            resolve_a2s_address("127.0.0.1".to_string(), "27015".to_string()),
        )
        .await
        .expect("literal addresses must not wait for a lookup slot");
        assert!(literal.is_ok());

        let hostname = tokio::spawn(resolve_a2s_address(
            "localhost".to_string(),
            "27015".to_string(),
        ));
        tokio::time::sleep(Duration::from_millis(50)).await;
        assert!(!hostname.is_finished(), "lookup ran past the limit");
        drop(held);
        let resolved = tokio::time::timeout(Duration::from_secs(5), hostname)
            .await
            .expect("lookup should finish once a slot frees")
            .unwrap();
        assert!(resolved.is_ok());
    });
}

#[test]
fn slow_lookups_do_not_hold_a2s_permits() {
    let gate = Arc::new(Semaphore::new(0));
    let slow_targets: Vec<A2SQueryTarget> = (0..GLOBAL_A2S_LIMIT)
        .map(|index| A2SQueryTarget {
            ip: format!("slow-{index}.example"),
            port: "27015".to_string(),
            timeout_ms: None,
        })
        .collect();
    let fast_targets: Vec<A2SQueryTarget> = (0..GLOBAL_A2S_LIMIT)
        .map(|index| A2SQueryTarget {
            ip: format!("10.0.0.{index}"),
            port: "27015".to_string(),
            timeout_ms: None,
        })
        .collect();
    let ok = |target: A2SQueryTarget, _resolved: ResolvedAddresses| A2SQueryResult {
        success: true,
        ip: target.ip,
        port: target.port,
        ..Default::default()
    };

    runtime().block_on(async {
        let slow = tokio::spawn(query_targets_with(
            slow_targets,
            Some(MAX_BATCH_CONCURRENCY),
            {
                let gate = Arc::clone(&gate);
                move |_ip: String, _port: String| {
                    let gate = Arc::clone(&gate);
                    async move {
                        let _released = gate.acquire_owned().await.unwrap();
                        Ok(Vec::new())
                    }
                }
            },
            ok,
        ));
        tokio::time::sleep(Duration::from_millis(20)).await;

        let fast = tokio::time::timeout(
            Duration::from_secs(5),
            query_targets_with(fast_targets, Some(MAX_BATCH_CONCURRENCY), no_lookup, ok),
        )
        .await
        .expect("queries must not wait behind stalled lookups");
        assert!(fast.iter().all(|result| result.success));
        assert!(!slow.is_finished());

        gate.add_permits(GLOBAL_A2S_LIMIT);
        let slow = slow.await.unwrap();
        assert_eq!(
            slow.iter()
                .map(|result| result.ip.as_str())
                .collect::<Vec<_>>(),
            (0..GLOBAL_A2S_LIMIT)
                .map(|index| format!("slow-{index}.example"))
                .collect::<Vec<_>>()
        );
    });
}
