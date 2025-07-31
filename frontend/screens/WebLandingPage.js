import React from 'react';

export default function WebLandingPage() {
  // Video demo embed (replace with your actual YouTube/Vimeo demo links)
  const videoUrl = 'https://www.youtube.com/embed/your-web-demo-id';
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0099ff 0%, #00c6ff 100%)', color: '#fff', fontFamily: 'sans-serif', padding: 0, margin: 0 }}>
      <header style={{ display: 'flex', alignItems: 'center', padding: '2rem 4rem 1rem 4rem' }}>
        <img src="/assets/flighttrace-logo.png" alt="FlightTrace Logo" style={{ width: 80, height: 80, borderRadius: 20, marginRight: 24, background: '#fff' }} />
        <div>
          <h1 style={{ fontSize: 48, margin: 0 }}>FlightTrace</h1>
          <p style={{ fontSize: 20, margin: 0 }}>Track your flights with ease</p>
        </div>
      </header>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
        <div>
          <section style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 32 }}>See FlightTrace in Action</h2>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <iframe
                width="480"
                height="270"
                src={videoUrl}
                title="FlightTrace Web Demo"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ borderRadius: 12 }}
              ></iframe>
            </div>
          </section>
          {/* ...existing code... */}
        </div>
      </main>
      <footer style={{ textAlign: 'center', padding: 24, color: '#e0f7fa', fontSize: 16 }}>
        &copy; {new Date().getFullYear()} FlightTrace. All rights reserved.
      </footer>
    </div>
  );
}
