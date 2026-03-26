import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import { DataUpload } from './pages/DataUpload';
import People from './pages/People';
import PMManagement from './pages/PMManagement';
import Alignment from './pages/Alignment';
import Reports from './pages/Reports';
import DiscrepancyReport from './pages/DiscrepancyReport';
import Settings from './pages/Settings';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Sidebar />
        <main className="pt-16 pl-60 transition-all duration-300">
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<DataUpload />} />
              {/* People tabs — deep-link any tab */}
              <Route path="/people" element={<People />} />
              <Route path="/employees" element={<People defaultTab="employees" />} />
              <Route path="/bench" element={<People defaultTab="bench" />} />
              <Route path="/new-joiners" element={<People defaultTab="new-joiners" />} />
              <Route path="/separations" element={<People defaultTab="separations" />} />
              {/* PM Management tabs */}
              <Route path="/pm-management" element={<PMManagement />} />
              <Route path="/pm-report" element={<PMManagement />} />
              <Route path="/gradewise-report" element={<PMManagement />} />
              {/* Alignment tabs */}
              <Route path="/alignment" element={<Alignment />} />
              <Route path="/monitoring" element={<Alignment />} />
              <Route path="/gad-analysis" element={<Alignment />} />
              {/* Reports tabs */}
              <Route path="/reports" element={<Reports />} />
              <Route path="/analytics" element={<Reports />} />
              {/* Standalone */}
              <Route path="/discrepancy" element={<DiscrepancyReport />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
