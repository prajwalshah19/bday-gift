'use client'

interface HeaderProps {
  photoCount: number
}

export default function Header({ photoCount }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-[1000] pointer-events-none">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md pointer-events-auto">
          <h1 className="font-script text-2xl text-primary-600">Our Map</h1>
        </div>

        {/* Photo count */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-md pointer-events-auto">
          <span className="text-sm text-gray-500">
            <span className="text-primary-500 font-medium">{photoCount}</span>
            {' '}
            {photoCount === 1 ? 'memory' : 'memories'}
          </span>
        </div>
      </div>
    </header>
  )
}
