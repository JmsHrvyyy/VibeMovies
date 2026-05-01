// Main App Component
function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      {/* Test Container */}
      <div className="bg-white p-10 rounded-2xl shadow-2xl text-center">
        <h1 className="text-3xl font-bold text-blue-600 underline">
          Vibe Check: Working! 🚀
        </h1>
        <p className="mt-4 text-gray-600">
          Kung kulay blue ang text at naka-dark mode ang background, success ang Tailwind setup mo.
        </p>
        <button className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-700 transition-colors">
          Nice One!
        </button>
      </div>
    </div>
  )
}

export default App