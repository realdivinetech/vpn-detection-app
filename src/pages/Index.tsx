export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6 text-center">
      <div className="space-y-8 max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Welcome to MGX</h1>

        <p className="text-lg text-muted-foreground animate-in fade-in delay-300 duration-700">Let's build something amazing</p>
      </div>
    </div>
  );
}
