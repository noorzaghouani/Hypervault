import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden select-none">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />
        <main className="flex-1 p-3 lg:p-4 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}
