import Link from 'next/link';
import Image from 'next/image';
import bgImage from "@/public/assets/bg-image.jpeg";
import logoImage from "@/public/assets/gsfp-logo.webp";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-green-600 text-white shadow-md fixed w-full left-0 top-0 right-0 z-10">
        <div className="container mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Image 
              src={logoImage}
              alt="GSFP Logo" 
              width={50} 
              height={50}
              className="rounded-full"
            />
            <h1 className="text-2xl font-bold">GSFP</h1>
          </div>
          <div className="space-x-4">
            <Link href="/signin" className="px-4 py-3 bg-white text-green-600 rounded-md font-medium hover:bg-gray-100 transition">
              Login
            </Link>
            {/* <Link href="/register" className="px-4 py-3 bg-yellow-500 text-white rounded-md font-medium hover:bg-yellow-600 transition">
              Register
            </Link> */}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-700 to-green-900 text-white pt-34 pb-16">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-8 md:mb-0">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ghana School Feeding Program
            </h2>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Monitoring & Evaluation Platform
            </h2>
            <p className="text-lg mb-6">
              A comprehensive system to monitor the implementation and impact of the Ghana School Feeding Program across schools.
            </p>
            <div className="flex space-x-4">
              <Link href="/about" className="px-6 py-3 bg-white text-green-600 rounded-md font-medium hover:bg-gray-100 transition">
                Learn More
              </Link>
              <Link href="/register" className="px-6 py-3 bg-yellow-500 text-white rounded-md font-medium hover:bg-yellow-600 transition">
                Get Started
              </Link>
            </div>
          </div>
          <div className="md:w-1/2">
            <Image 
              src={bgImage}
              alt="Students eating school meal" 
              width={600} 
              height={400}
              className="rounded-lg shadow-lg bg_radius"
            />
          </div>
        </div>
      </section>

      {/* Stakeholders Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-800">Our Stakeholders</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { title: 'Teachers', icon: '👨‍🏫', desc: 'Monitor student attendance and health' },
              { title: 'Caterers', icon: '👩‍🍳', desc: 'Provide nutritious meals to students' },
              { title: 'Students', icon: '👨‍🎓', desc: 'Benefit from healthy school meals' },
              { title: 'Headmasters', icon: '🧑‍💼', desc: 'Oversee program implementation' },
              { title: 'Food Suppliers', icon: '🚚', desc: 'Supply quality ingredients' }
            ].map((item, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-md hover:shadow-lg transition text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-green-600">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Program Impact Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-800">Program Impact</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">1.6M+</div>
              <p className="text-gray-700">Students Benefiting</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">5,000+</div>
              <p className="text-gray-700">Schools Participating</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">20%</div>
              <p className="text-gray-700">Increase in Attendance</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h2 className="text-xl font-bold mb-4">Ghana School Feeding Program</h2>
              <p className="text-gray-400">Monitoring & Evaluation Platform</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
                <ul className="space-y-2">
                  <li><Link href="/about" className="text-gray-400 hover:text-white">About</Link></li>
                  <li><Link href="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
                  <li><Link href="/faq" className="text-gray-400 hover:text-white">FAQ</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Resources</h3>
                <ul className="space-y-2">
                  <li><Link href="/news" className="text-gray-400 hover:text-white">News</Link></li>
                  <li><Link href="/reports" className="text-gray-400 hover:text-white">Reports</Link></li>
                  <li><Link href="/guidelines" className="text-gray-400 hover:text-white">Guidelines</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-3">Legal</h3>
                <ul className="space-y-2">
                  <li><Link href="/privacy" className="text-gray-400 hover:text-white">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="text-gray-400 hover:text-white">Terms of Use</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} Ghana School Feeding Program. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}