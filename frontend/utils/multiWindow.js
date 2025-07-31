// Multi-window support for web/desktop (experimental)
export function openFlightDetail(flightId) {
  if (typeof window !== 'undefined') {
    window.open(`/flight/${flightId}`, '_blank', 'width=600,height=800');
  }
}

export function openDashboard() {
  if (typeof window !== 'undefined') {
    window.open(`/dashboard`, '_blank', 'width=1200,height=800');
  }
}
