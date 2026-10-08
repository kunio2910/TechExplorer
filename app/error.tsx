"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="empty">
      <h1>Unable to load the explorer</h1>
      <p>Check your database connection and try again.</p>
      <button onClick={reset}>Try again</button>
    </main>
  );
}
