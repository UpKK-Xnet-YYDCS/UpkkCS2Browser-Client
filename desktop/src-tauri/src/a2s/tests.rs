use super::*;
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

    let result = a2s_query("127.0.0.1", &address.port().to_string(), Some(1_000));
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
    let results = runtime().block_on(query_targets_with(targets, Some(2), {
        let active = Arc::clone(&active);
        let maximum = Arc::clone(&maximum);
        move |target| {
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
    let results = runtime().block_on(query_targets_with(targets, None, |_| {
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
