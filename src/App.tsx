import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800 gap-8">
        <div className="flex gap-8">
          <a
            href="https://vite.dev"
            target="_blank"
            className="transition-transform hover:scale-110"
          >
            <img
              src={viteLogo}
              alt="Vite logo"
              className="h-24 w-24 drop-shadow-md"
            />
          </a>
          <a
            href="https://react.dev"
            target="_blank"
            className="transition-transform hover:scale-110"
          >
            <img
              src={reactLogo}
              alt="React logo"
              className="h-24 w-24 drop-shadow-md"
            />
          </a>
        </div>

        <h1 className="text-4xl font-bold tracking-tight">
          Vite + React
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
