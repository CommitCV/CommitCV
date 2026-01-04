import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 gap-8">

        <h1 className="text-4xl font-bold tracking-tight">
          CommitCV
        </h1>

        <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center gap-4">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-medium
                       hover:bg-indigo-700 active:scale-95 transition"
          >
            count is {count}
          </button>

          <p className="text-sm text-gray-600">
            Edit <code className="px-1 py-0.5 bg-gray-100 rounded">src/App.tsx</code> and save to test HMR
          </p>
        </div>

        <p className="text-sm text-gray-500">
          Click on the Vite and React logos to learn more
        </p>
      </div>
    </>
  )
}

export default App
