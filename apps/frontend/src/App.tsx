import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MapPage } from './pages/MapPage';

function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

