import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import { DataUpload } from './pages/DataUpload';
import NewJoiners from './pages/NewJoiners';
import Analytics from './pages/Analytics';
import EmployeesList from './pages/EmployeesList';
import PMReport from './pages/PMReport';
import SeparationsList from './pages/SeparationsList';
import BenchResources from './pages/BenchResources';
import PracticeReports from './pages/PracticeReports';
import Settings from './pages/Settings';
import Monitoring from './pages/Monitoring';
import GradewisePMReport from './pages/GradewisePMReport';
import GADAnalysis from './pages/GADAnalysis';
import DiscrepancyReport from './pages/DiscrepancyReport';
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
              <Route path="/new-joiners" element={<NewJoiners />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/employees" element={<EmployeesList />} />
              <Route path="/bench" element={<BenchResources />} />
              <Route path="/pm-report" element={<PMReport />} />
              <Route path="/separations" element={<SeparationsList />} />
              <Route path="/reports" element={<PracticeReports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/monitoring" element={<Monitoring />} />
              <Route path="/gradewise-report" element={<GradewisePMReport />} />
              <Route path="/gad-analysis" element={<GADAnalysis />} />
              <Route path="/discrepancy" element={<DiscrepancyReport />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
