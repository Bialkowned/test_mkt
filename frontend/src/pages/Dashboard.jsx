export default function Dashboard({ user }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Welcome, {user.first_name}!</h1>
      <div className="bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Your Account</h2>
        <div className="space-y-2">
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
          <p><strong>Role:</strong> <span className="capitalize">{user.role}</span></p>
          <p><strong>Member since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      </div>
      {user.role === 'builder' && (
        <div className="mt-8 bg-blue-50 p-8 rounded-lg border border-blue-200">
          <h3 className="text-xl font-bold mb-4">Get Started as a Builder</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Create a project (your app/website)</li>
            <li>Define test jobs with user journeys</li>
            <li>Set payout amount and limits</li>
            <li>Receive structured feedback from testers</li>
          </ol>
        </div>
      )}
      {user.role === 'tester' && (
        <div className="mt-8 bg-green-50 p-8 rounded-lg border border-green-200">
          <h3 className="text-xl font-bold mb-4">Get Started as a Tester</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Browse available test jobs</li>
            <li>Accept jobs that match your skills</li>
            <li>Complete user journeys and submit feedback</li>
            <li>Earn money for quality submissions</li>
          </ol>
        </div>
      )}
    </div>
  )
}
