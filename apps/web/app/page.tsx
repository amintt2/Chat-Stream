import Link from 'next/link';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">P2P Stream</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-12">
        {/* Stream cards will be dynamically loaded */}
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No live streams yet</p>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          href="/broadcast"
          className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition"
        >
          Start Streaming
        </Link>
      </div>
    </main>
  );
}
