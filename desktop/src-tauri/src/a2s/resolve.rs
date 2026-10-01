//! Target address resolution for A2S queries. It runs before an A2S permit is
//! taken, so slow hostname lookups never hold the UDP query slots.

use std::io;
use std::net::{SocketAddr, ToSocketAddrs};
use std::sync::{Arc, OnceLock};
use tokio::sync::Semaphore;

pub(super) type ResolvedAddresses = io::Result<Vec<SocketAddr>>;

/// Blocking `getaddrinfo` lookups in flight across every A2S command.
const GLOBAL_RESOLVE_LIMIT: usize = 6;

static GLOBAL_RESOLVE_LIMITER: OnceLock<Arc<Semaphore>> = OnceLock::new();

fn global_resolve_limiter() -> Arc<Semaphore> {
    GLOBAL_RESOLVE_LIMITER
        .get_or_init(|| Arc::new(Semaphore::new(GLOBAL_RESOLVE_LIMIT)))
        .clone()
}

/// Resolves `ip:port` exactly as `UdpSocket::connect("ip:port")` does: socket
/// address literals parse inline, anything else goes through `to_socket_addrs`
/// on a bounded blocking task. Connecting to the returned addresses in order
/// yields the same socket state and error text as connecting by string.
pub(super) async fn resolve_a2s_address(ip: String, port: String) -> ResolvedAddresses {
    let address = format!("{ip}:{port}");
    if let Ok(parsed) = address.parse::<SocketAddr>() {
        return Ok(vec![parsed]);
    }
    let permit = global_resolve_limiter()
        .acquire_owned()
        .await
        .expect("global A2S resolve limiter must remain open");
    tokio::task::spawn_blocking(move || {
        let _permit = permit;
        address.to_socket_addrs().map(Iterator::collect)
    })
    .await
    .unwrap_or_else(|error| Err(io::Error::other(error)))
}

#[cfg(test)]
pub(super) fn resolve_limit_permits() -> (Arc<Semaphore>, usize) {
    (global_resolve_limiter(), GLOBAL_RESOLVE_LIMIT)
}
