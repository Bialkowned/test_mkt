export default function Jobs({ user }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">
        {user.role === 'builder' ? 'My Test Jobs' : 'Available Jobs'}
      </h1>
      <div className="bg-white p-12 rounded-lg shadow text-center">
        <p className="text-gray-600">Jobs feature coming soon...</p>
      </div>
    </div>
  )
}
