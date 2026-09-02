// ============================================================================
// EDIT YOUR PORTFOLIO CONTENT HERE
// This file is the single source of truth. Update the values below to change
// what appears on the site — no need to touch the components.
// ============================================================================

export const profile = {
  name: 'Jehosue Biscarra',
  role: 'Web Developer',
  location: 'La Union, Philippines',
  email: 'jehosuebiscarra@gmail.com',
  avatarUrl: '/images/profile.png',
  phone: '+63 9923314755',
  resumeUrl: '/documents/Jeho-Update-Resume.pdf',
  // Fill in your social URLs below — leave empty to hide the icon
  githubUrl: 'https://github.com/Jehooooo',
  linkedinUrl: 'https://www.linkedin.com/in/jehosue-biscarra-447a2a25b',
  instagramUrl: 'https://www.instagram.com/capt.jehoooo/',
}

export type ProjectCategory =
  | 'Web Development'
  | 'Python'
  | 'Java'
  | 'Academic'
  | 'Other'

export type ProjectStatus = 'Completed' | 'In Progress' | 'Planned'

export type WorkflowStep = {
  step: string
  status: string
  desc?: string
}

export type FeatureDetail = {
  title: string
  details: string[]
}

export type DetailedTech = {
  category: string
  tech: string
}

export type Project = {
  id?: string
  title: string
  subtitle?: string
  description: string
  overview?: string
  // Optional image fallback (used when there is no video). Add files to /public.
  image?: string
  // Optional media. Provide ONE of: a local mp4 path, a YouTube URL, or a Vimeo URL.
  video?: string
  bottomVideo?: string
  youtube?: string
  vimeo?: string
  technologies: string[]
  detailedTech?: DetailedTech[]
  workflow?: WorkflowStep[]
  features?: FeatureDetail[]
  role: string
  categories: ProjectCategory[]
  status: ProjectStatus
  // Buttons only render when a URL is provided.
  liveUrl?: string
  githubUrl?: string
  projectUrl?: string
}

// Replace these placeholders with your real projects.
export const projects: Project[] = [
  {
    id: 'dmmmsu-disaster-system',
    title: 'DMMMSU Disaster/Emergency Reports Management System',
    subtitle:
      'Centralized Enterprise Incident Management Platform for Don Mariano Marcos Memorial State University – South La Union Campus (DMMMSU-SLUC)',
    description:
      'Digitizing incident reporting, automating administrative response workflows, tracking campus emergencies, and dispatching real-time notifications.',
    overview:
      'The DMMMSU-SLUC Disaster/Emergency Incident Reports Management System replaces manual, paper-based incident logging across campus grounds with an automated digital workflow. When emergencies or safety hazards occur (e.g., severe weather damage, fire hazards, facility accidents, power outages), university staff can log reports instantly. Administrators can review, assign response status, and track incidents to resolution while generating real-time analytics and standardized PDF documentation.',
    image: '/images/dmmmsu-incident.png',
    video: '/videos/0809.mp4',
    bottomVideo: '/videos/0809.mp4',
    technologies: [
      'React 18',
      'TypeScript',
      'Vite',
      'Tailwind CSS',
      'Python (Flask)',
      'SQLAlchemy',
      'PyMySQL',
      'JWT Auth',
      'ReportLab PDF',
    ],
    detailedTech: [
      { category: 'Framework', tech: 'React 18 + TypeScript' },
      { category: 'Build Tool', tech: 'Vite' },
      { category: 'Styling', tech: 'Tailwind CSS' },
      { category: 'Routing & State', tech: 'React Router DOM, React Context API' },
      { category: 'API Framework', tech: 'Python (Flask) with Flask-CORS' },
      { category: 'ORM/Database Access', tech: 'SQLAlchemy / PyMySQL' },
      { category: 'Authentication', tech: 'JWT (Flask-JWT-Extended) with Werkzeug password hashing' },
      { category: 'PDF Engine', tech: 'ReportLab (Automated document generation)' },
    ],
    workflow: [
      { step: 'Staff Files Incident', status: 'Pending', desc: 'Staff logs an incident report with hazard category, details, and location.' },
      { step: 'Admin Reviews & Assigns', status: 'In Progress', desc: 'Admin reviews case severity and dispatches appropriate response personnel.' },
      { step: 'Staff Solves Incident', status: 'Solved', desc: 'Designated responders resolve the emergency and upload resolution status.' },
      { step: 'Automated Export & Alerts', status: 'PDF & Alerts', desc: 'System automatically generates standardized PDF reports and dispatches email/SMS alerts.' },
    ],
    features: [
      {
        title: '1. Structured Incident Reporting Workflow',
        details: [
          'Staff Files Incident ──► Status: Pending',
          'Admin Reviews & Assigns ──► Status: In Progress',
          'Staff Solves Incident ──► Status: Solved',
          '[Automated PDF Export & Email/SMS Alerts Sent]',
        ],
      },
      {
        title: '2. Live Analytics Dashboard',
        details: [
          'Incident Counters: Real-time tally of Total, Pending, In Progress, and Solved cases.',
          'Weekly Incident Frequency (Bar Chart)',
          'Monthly Incident Trends (Line Chart)',
          'Incident Status Breakdown (Pie Chart)',
        ],
      },
      {
        title: '3. Automated Notifications (Email & Telegram)',
        details: [
          'Email Alerts: Sent via Gmail SMTP to designated personnel when an incident is logged or updated.',
          'Telegram Bot: Instant dispatch to Telegram group channels for immediate emergency response visibility.',
        ],
      },
      {
        title: '4. PDF Generation & Reporting',
        details: [
          'One-click individual incident PDF download.',
          'Compiled summary report generation for campus safety audits.',
        ],
      },
      {
        title: '5. Role-Based Access Control (RBAC) & User Management',
        details: [
          'Separate login portals for Administrators and Staff.',
          'Admin capabilities to create, modify, and deactivate staff user accounts.',
        ],
      },
    ],
    role: 'Lead Full-Stack Developer & Team Lead',
    categories: ['Web Development', 'Python'],
    status: 'Completed',
  },

]

export const stats = [
  { value: '13', label: 'Team Members Led' },
  { value: '20+', label: 'Videos Delivered' },
  { value: '10+', label: 'Clients' },
  { value: '2+', label: 'Programming Leadership Roles' },
]

export const skillGroups = [
  {
    title: 'Web Development & Frameworks',
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Django', 'Flask'],
  },
  {
    title: 'Programming',
    skills: ['Python', 'Java'],
  },
  {
    title: 'Database & Tools',
    skills: ['MongoDB', 'MySQL', 'Git', 'GitHub', 'Vercel'],
  },
  {
    title: 'Creative Tools',
    skills: ['Adobe Premiere Pro', 'Photoshop'],
  },
]

export type TimelineCategory = 'Experience' | 'Education' | 'Milestone'

export type TimelineItem = {
  id: string
  title: string
  period: string
  organization: string
  category: TimelineCategory
  description: string
}

export const timelineItems: TimelineItem[] = [
  {
    id: '2',
    title: 'BS Computer Science',
    period: '2024 - 2028 (expected)',
    organization: 'Don Mariano Marcos Memorial State University - South La Union Campus',
    category: 'Education',
    description:
      "Throughout my academic journey, I have consistently taken on leadership roles in software development projects. During my first year, I served as the project leader for two teams, managing the development of programming projects for nearly half of our section. In my second year, I collaborated directly with clients to develop software solutions while leading a team of 13 members. In my third year, I led the development of three software projects in collaboration with our municipality, delivering solutions that supported both community initiatives and academic requirements.",
  },
  {
    id: '3',
    title: 'Freelance Video Editor',
    period: '2022 - 2023',
    organization: 'Self-employed',
    category: 'Experience',
    description:
      "Produced 20+ short-form and promotional videos for 10+ clients, managing projects end-to-end: editing, color grading, motion graphics, and sound design using Adobe Premiere Pro and After Effects. Collaborated with clients to define creative briefs and deliver polished drafts within 48-72 hours; iterated based on feedback to achieve a high client approval rate. Optimized videos for social platforms (YouTube, Facebook, Instagram) by improving pacing, captions, and thumbnails, boosting view-through and engagement metrics. Organized assets, maintained version control, and encoded final deliverables to meet platform specifications and branding guidelines.",
  },
  {
    id: '6',
    title: 'Hello World! 👋',
    period: '2022',
    organization: 'The Beginning',
    category: 'Milestone',
    description:
      'Wrote my first line of code using python.',
  },
]

export const experience = [
  {
    title: 'Video Editor',
    company: 'Self Employed',
    period: 'Jul 2022 — Mar 2023',
    points: [
      'Produced 20+ short-form and promotional videos.',
      'Worked with 10+ clients.',
      'Managed projects from editing through final delivery.',
      'Worked with Adobe Premiere Pro and After Effects.',
      'Collaborated with clients and incorporated feedback.',
      'Delivered projects within 48–72 hours.',
    ],
  },
]

export const leadership = [
  {
    title: 'First Year — Project Leader',
    points: [
      'Acted as project leader for two groups.',
      "Handled approximately half of the section's programming projects.",
    ],
  },
  {
    title: 'Second Year — Team Lead',
    points: [
      'Collaborated with clients on software solutions.',
      'Led a team of 13 members.',
    ],
  },
]

export type Certificate = {
  id: string
  title: string
  issuer: string
  fileUrl: string
  fileType: 'pdf' | 'image'
  description?: string
}

export const certifications: Certificate[] = [
  {
    id: 'cybersecurity',
    title: 'Introduction to Cybersecurity',
    issuer: 'Cisco Networking Academy',
    fileUrl: '/documents/Introduction_to_Cybersecurity_certificate.pdf',
    fileType: 'pdf',
    description:
      'Verified certification in foundational cybersecurity principles, network security, and threat defense strategies.',
  },
  {
    id: 'python-1',
    title: 'Python Essentials 1',
    issuer: 'Cisco Networking Academy',
    fileUrl: '/documents/Python_Essentials_1.pdf',
    fileType: 'pdf',
    description:
      'Verified certification covering foundational Python programming concepts, control flow, functions, and data structures.',
  },
  {
    id: 'python-2',
    title: 'Python Essentials 2',
    issuer: 'Cisco Networking Academy',
    fileUrl: '/documents/Python_Essentials_2.pdf',
    fileType: 'pdf',
    description:
      'Advanced Python certification covering Object-Oriented Programming (OOP), modules, packages, and exception handling.',
  },
  {
    id: 'responsive-web-design',
    title: 'Responsive Web Design V8',
    issuer: 'freeCodeCamp',
    fileUrl: '/images/v8certi.png',
    fileType: 'image',
    description:
      'Verified freeCodeCamp certification proving mastery of HTML5, CSS3, responsive layouts, Flexbox, and CSS Grid.',
  },
]

export const softSkills = [
  'Leadership',
  'Curiosity',
  'Problem Solving',
  'Initiative',
  'Goal Focus',
]

export const navLinks = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Projects', href: '#projects' },
  { label: 'Skills', href: '#skills' },
  { label: 'Experience', href: '#experience' },
  { label: 'Contact', href: '#contact' },
]
