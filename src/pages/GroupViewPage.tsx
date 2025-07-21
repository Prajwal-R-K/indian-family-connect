
import React from 'react';
import Layout from '@/components/Layout';

const GroupViewPage: React.FC = () => {
  return (
    <Layout isLoggedIn={true}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Group View</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Group view functionality coming soon...</p>
        </div>
      </div>
    </Layout>
  );
};

export default GroupViewPage;
