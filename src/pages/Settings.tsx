
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ProfileSettings } from '@/components/ProfileSettings';
import { Navbar } from '@/components/Navbar';

const Settings = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
            <ProfileSettings />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Settings;
