import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-green-600 text-white py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold">About GSFP</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold text-green-600 mb-6">Ghana School Feeding Program Monitoring & Evaluation Platform</h2>
          
          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Overview</h3>
            <p className="text-gray-700 mb-4">
              The Ghana School Feeding Program (GSFP) Monitoring & Evaluation Platform is a comprehensive digital system designed to track, analyze, and improve the implementation of the national school feeding initiative across Ghana. This platform serves as a central hub for all stakeholders involved in the program.
            </p>
            <p className="text-gray-700 mb-4">
              Launched in 2020, this platform represents a significant step forward in the digital transformation of the GSFP, which has been providing nutritious meals to school children since 2005.
            </p>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Purpose & Objectives</h3>
            <p className="text-gray-700 mb-4">
              The primary purpose of this system is to enhance the effectiveness, transparency, and accountability of the Ghana School Feeding Program through robust data collection and analysis.
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
              <li>Track meal provision and quality across all participating schools</li>
              <li>Monitor program implementation against established guidelines</li>
              <li>Measure impact on student enrollment, attendance, and nutrition</li>
              <li>Facilitate efficient resource allocation and fund disbursement</li>
              <li>Enable evidence-based decision-making for program improvements</li>
              <li>Promote transparency and accountability in program management</li>
            </ul>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Key Features</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-600">Data Collection</h4>
                <p className="text-gray-700">
                  Structured forms for caterers, school administrators, and monitoring officers to input data on meal provision, student participation, and compliance with nutritional guidelines.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-600">Reporting Dashboard</h4>
                <p className="text-gray-700">
                  Real-time visualization of key performance indicators, allowing stakeholders to track program implementation across different regions and schools.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-600">Compliance Monitoring</h4>
                <p className="text-gray-700">
                  Tools to verify adherence to menu plans, food quality standards, and hygienic food preparation practices.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-600">Financial Tracking</h4>
                <p className="text-gray-700">
                  Systems to monitor budget allocation, fund disbursement, and expenditure across all levels of program implementation.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-green-600">Impact Assessment</h4>
                <p className="text-gray-700">
                  Tools to measure the program's effect on enrollment, attendance, retention, and nutritional status of participating students.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">System Users</h3>
            <p className="text-gray-700 mb-4">
              The platform serves various stakeholders involved in the implementation and oversight of the GSFP:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li><span className="font-medium">Program Administrators:</span> National and regional coordinators who oversee the entire program</li>
              <li><span className="font-medium">School Officials:</span> Headmasters and teachers who verify meal provision and student participation</li>
              <li><span className="font-medium">Caterers:</span> Food service providers who prepare and serve meals to students</li>
              <li><span className="font-medium">Monitoring Officers:</span> Field staff who conduct site visits and verify program implementation</li>
              <li><span className="font-medium">Government Officials:</span> Representatives from relevant ministries who require oversight information</li>
              <li><span className="font-medium">Development Partners:</span> Organizations supporting the program who need impact data</li>
            </ul>
          </section>

          <section>
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Program Impact</h3>
            <p className="text-gray-700 mb-4">
              Through effective monitoring and evaluation facilitated by this platform, the Ghana School Feeding Program has achieved significant impact:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Currently benefits over 1.6 million students across Ghana</li>
              <li>Operates in more than 5,000 public primary schools nationwide</li>
              <li>Has contributed to a 20% increase in school attendance rates</li>
              <li>Improved nutritional status of participating students</li>
              <li>Enhanced local food production through procurement from local farmers</li>
              <li>Created employment opportunities for thousands of caterers and food suppliers</li>
            </ul>
          </section>
        </div>

        {/* Simple Back Link */}
        <div className="text-center mt-8">
          <Link href="/" className="text-green-600 hover:text-green-800 font-medium">
            Return to Home
          </Link>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-gray-800 text-white py-6 text-center">
        <p>&copy; {new Date().getFullYear()} Ghana School Feeding Program. All rights reserved.</p>
      </footer>
    </div>
  );
}