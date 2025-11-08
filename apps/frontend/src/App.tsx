import React from 'react';

function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">
            🎪 Wonderland
          </h1>
          <p className="text-gray-600 mt-2">
            AI가 안내하는 놀라운 장소 발견 플랫폼
          </p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-700">
            프로젝트가 성공적으로 초기화되었습니다! 🎉
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;

