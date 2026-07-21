// Central content source for the portfolio. Aligned with Deepak Kumar's resume.

export const site = {
  name: 'Deepak Kumar',
  role: 'Senior Software Developer',
  tagline: 'Java · Spring Boot · Microservices · Cloud',
  location: 'Pune, Maharashtra, India',
  email: 'deepakprajapati.officials@gmail.com',
  // Resume hosted in /public so it is versioned with the site.
  resumeUrl: 'resume.pdf',
  url: 'https://sudo-deepak.github.io/portfolio',
  description:
    'Senior Software Developer with 4+ years of experience designing scalable, secure, high-performance enterprise systems with Java, Spring Boot, microservices, and cloud.',
  socials: {
    email: 'mailto:deepakprajapati.officials@gmail.com',
    linkedin: 'https://linkedin.com/in/deepak-kumar-8362b1154',
    github: 'https://github.com/Sudo-Deepak',
    youtube: 'https://www.youtube.com/@JavaRevisit',
    instagram: 'https://www.instagram.com/java.revisit',
  },
};

export const nav = [
  { label: 'About', href: '#about' },
  { label: 'Skills', href: '#skills' },
  { label: 'Experience', href: '#experience' },
  { label: 'Projects', href: '#projects' },
  { label: 'Services', href: '#services' },
  { label: 'Education', href: '#education' },
  { label: 'Contact', href: '#contact' },
];

export const metrics = [
  { target: 4, suffix: '+', label: 'Years building production systems' },
  { target: 15, suffix: '+', label: 'Systems & services shipped' },
  { target: 5, suffix: '+', label: 'Industry domains delivered across' },
  { target: 60, prefix: '~', suffix: '%', label: 'Peak performance boost achieved' },
];

export const whatIBuild = [
  {
    icon: 'server',
    title: 'Enterprise Backend Systems',
    body: 'High-performance APIs, microservices, and database-driven platforms built for scale, reliability, and secure business-critical workflows.',
  },
  {
    icon: 'plug',
    title: 'Business & Integrations',
    body: 'Payments, file storage, payroll, and enterprise (SAP, OpenText) integrations that streamline operations and reduce manual errors.',
  },
  {
    icon: 'layers',
    title: 'Full-Stack Solutions',
    body: 'Backend-first systems designed for clean API consumption and pragmatic frontend collaboration into end-to-end, production-ready products.',
  },
  {
    icon: 'sparkles',
    title: 'Smart Automation & AI',
    body: 'Intelligent workflows and automation using Spring AI and data-driven techniques to improve efficiency and user experience.',
  },
];

export const skillGroups = [
  { icon: 'code-2', title: 'Languages', items: ['Java (8/11/17)', 'SQL', 'JavaScript'] },
  {
    icon: 'cpu',
    title: 'Frameworks & Libraries',
    items: ['Spring Boot', 'Spring Cloud', 'Spring Security', 'Spring Data JPA', 'Hibernate', 'Spring AI'],
  },
  { icon: 'layout', title: 'Frontend', items: ['React JS', 'HTML', 'CSS'] },
  { icon: 'database', title: 'Databases', items: ['MySQL', 'PostgreSQL', 'MongoDB', 'SAP HANA'] },
  {
    icon: 'repeat',
    title: 'Messaging & Integrations',
    items: ['Apache Kafka', 'RabbitMQ', 'Stripe', 'Box', 'OpenText', 'Staffology'],
  },
  { icon: 'cloud', title: 'Cloud & DevOps', items: ['AWS (EC2, S3, RDS, CloudFront)', 'Docker', 'Kubernetes', 'Jenkins', 'CI/CD'] },
  { icon: 'server', title: 'SAP Technologies', items: ['CDS', 'OData', 'CQN', 'SAP BTP', 'CAP'] },
  {
    icon: 'layout-dashboard',
    title: 'Architecture & Design',
    items: ['Microservices', 'Event-Driven', 'REST APIs', 'GraphQL', 'WebSocket', 'Design Patterns'],
  },
  {
    icon: 'wrench',
    title: 'Tools & Testing',
    items: ['Git', 'Maven', 'Gradle', 'Postman', 'Jira', 'JUnit', 'Mockito', 'Liquibase', 'IntelliJ Profiler'],
  },
];

export const experience = [
  {
    role: 'Senior Developer',
    company: 'AsInt, Inc.',
    link: 'https://asint.net',
    period: 'Aug 2024 – Present',
    location: 'Remote',
    summary:
      'Leading backend development of an enterprise Asset Integrity Suite (AIS) for the Oil & Gas domain, delivering accurate, scalable workflows integrated with SAP S/4HANA and SAP HANA.',
    points: [
      'Architected core modules integrating SAP S/4HANA & SAP HANA, supporting 1000+ daily asset transactions.',
      'Engineered asset-integrity calculations (TMIN, MAWP, corrosion rate), improving computational accuracy by ~40%.',
      'Optimized SAP HANA SQL views and CDS models, reducing query latency by 25–30%.',
      'Resolved memory leaks with IntelliJ Profiler, cutting memory usage by ~45%.',
      'Refactored modules using Factory & Strategy patterns, lowering maintenance effort by ~50%.',
      'Implemented a distributed scheduler-lock to prevent duplicate job execution in concurrent environments.',
      'Mentored interns and drove clean-code standards, maintaining 95% sprint-delivery consistency.',
    ],
  },
  {
    role: 'Software Engineer',
    company: 'Coditas Solutions LLP',
    link: 'https://coditas.com',
    period: 'Oct 2023 – Jul 2024',
    location: 'Pune, India',
    summary:
      'Delivered secure, scalable backend systems across healthcare, HR, and enterprise products with a focus on microservices, API performance, and cloud deployments.',
    points: [
      'Built microservices with Spring Boot & Spring Cloud, improving scalability and fault tolerance.',
      'Reduced system downtime by ~40% through performance tuning and optimization.',
      'Optimized MySQL/PostgreSQL schemas and queries, improving database performance by ~60%.',
      'Secured services with JWT & Spring Security and API Gateway routing via Spring Cloud Gateway.',
      'Improved API performance through caching, pagination, and indexing; integrated Stripe and Box.',
    ],
  },
  {
    role: 'Associate Software Engineer',
    company: 'Coditas Solutions LLP',
    link: 'https://coditas.com',
    period: 'Jan 2022 – Sep 2023',
    location: 'Pune, India',
    summary:
      'Built and maintained backend APIs and services in agile teams, collaborating cross-functionally to ship production-ready features.',
    points: [
      'Designed RESTful APIs integrating external systems and services.',
      'Applied clean code and design patterns, cutting application load time by ~60%.',
      'Implemented authentication/authorization with Spring Security and API-gateway routing.',
      'Supported CI/CD pipelines and deployments alongside DevOps teams.',
    ],
  },
];

export const projects = [
  {
    image: 'enterprise-asset',
    title: 'Enterprise Asset Management Platform',
    domain: 'Oil & Gas',
    role: 'Senior Developer',
    outcome: 'Supports 1000+ daily asset transactions',
    featured: true,
    summary:
      'Enterprise-grade platform to manage asset reliability and integrity, integrating SAP APM capabilities and complex integrity calculations for high-volume operational data.',
    stats: [
      { value: '95%', label: 'sprint delivery consistency' },
      { value: '~40%', label: 'calculation accuracy gain' },
      { value: '~30%', label: 'faster data queries' },
    ],
    highlights: [
      'Configurable, rule-based business workflows',
      'Integrity calcs: TMIN, MAWP & corrosion rate',
      'Enterprise integrations for data consistency',
      'Optimized performance & memory usage',
    ],
    tech: ['Java', 'Spring Boot', 'Spring Security', 'SAP HANA', 'CDS', 'OData', 'OpenText', 'SAP BTP', 'CAP', 'REST API'],
  },
  {
    image: 'workforce-payroll',
    title: 'Workforce & Payroll Management System',
    domain: 'Hospitality',
    role: 'Software Engineer',
    outcome: 'Automated payroll across multiple branches',
    summary:
      'Workforce and operations platform for hospitality businesses, automating scheduling, attendance, payroll, and multi-branch coordination.',
    highlights: [
      'Shift scheduling & multi-branch coordination',
      'Real-time attendance validation',
      'Automated payroll & invoice generation',
      'Reduced manual operational errors',
    ],
    tech: ['Java', 'Spring Boot', 'MySQL', 'Spring Security', 'JWT', 'AWS', 'REST API', 'GraphQL', 'Staffology'],
  },
  {
    image: 'healthcare-saas',
    title: 'Secure Healthcare SaaS Platform',
    domain: 'Healthcare',
    role: 'Software Engineer',
    outcome: 'Multi-tenant SaaS with monetised file access',
    summary:
      'SaaS medical imaging and file-management platform with monetised downloads, secure storage, and multi-tenant, role-based access.',
    highlights: [
      'File monetisation & configurable pricing',
      'Centralised storage for 3D scans & records',
      'Role-based access & subscription plans',
      'Admin controls for pricing & organisations',
    ],
    tech: ['Java', 'Spring Boot', 'PostgreSQL', 'Microservices', 'RabbitMQ', 'Stripe', 'Box API', 'AWS'],
  },
  {
    image: 'interview-scheduler',
    title: 'Interview Scheduling & Coordination Platform',
    domain: 'HR & Recruitment',
    role: 'Associate Software Engineer',
    outcome: 'Streamlined end-to-end interview coordination',
    summary:
      'Interview scheduling system that streamlines recruitment with candidate slot booking, tracking dashboards, and evaluation workflows.',
    highlights: [
      'Employee-driven candidate slot booking',
      'TA dashboards for interview tracking',
      'Evaluation & feedback workflows',
      'Improved recruitment efficiency',
    ],
    tech: ['Java', 'Spring Boot', 'MySQL', 'Spring Cloud', 'Liquibase', 'REST API', 'Google Services'],
  },
  {
    image: 'learning-platform',
    title: 'Learning & Development Platform',
    domain: 'HR & Training',
    role: 'Associate Software Engineer',
    outcome: 'Full intern lifecycle & training management',
    summary:
      'Platform to streamline learning & development workflows: intern lifecycle management, mentor mapping, and batch-level training.',
    highlights: [
      'Intern lifecycle management',
      'Daily performance tracking & mentor mapping',
      'Batch-level training organisation',
      'Reporting & analytics',
    ],
    tech: ['Java', 'Spring Boot', 'MongoDB', 'Spring Data Mongo', 'Hibernate', 'REST API'],
  },
];

export const education = {
  degree: 'B.Tech in Computer Science and Engineering',
  school: 'IES Institute of Technology and Management (RGPV)',
  period: 'Aug 2018 – Jul 2022',
  location: 'Bhopal, MP, India',
};

export const awards = [
  { title: 'Academic Best Performer', org: 'IES University, Bhopal', date: 'May 2022' },
  { title: 'Star Achiever', org: 'IES University, Bhopal', date: 'Feb 2020' },
  { title: 'Star Achiever', org: 'IES University, Bhopal', date: 'Feb 2019' },
];

export const languages = ['English', 'Hindi', 'Bhojpuri'];

export const services = [
  {
    icon: 'server',
    title: 'Backend Development',
    body: 'Scalable Spring Boot microservices, secure REST & GraphQL APIs, and performance-tuned, database-driven systems built to last.',
    includes: ['Microservices & REST/GraphQL APIs', 'Auth & security (JWT, Spring Security)', 'Database design & optimization'],
  },
  {
    icon: 'plug',
    title: 'System & API Integration',
    body: 'Connect your product to the services it depends on — payments, storage, payroll, and enterprise platforms — reliably.',
    includes: ['Stripe, Box, Staffology, OpenText', 'SAP S/4HANA & SAP HANA', 'Event-driven with Kafka / RabbitMQ'],
  },
  {
    icon: 'cloud',
    title: 'Cloud & DevOps',
    body: 'Ship and scale on AWS with containerization and automated pipelines for production-grade reliability.',
    includes: ['AWS (EC2, S3, RDS, CloudFront)', 'Docker & Kubernetes', 'CI/CD with Jenkins'],
  },
  {
    icon: 'users',
    title: 'Consulting & Mentoring',
    body: 'Architecture reviews, performance audits, and hands-on mentoring to level up your codebase and your team.',
    includes: ['Architecture & code reviews', 'Performance & memory tuning', 'Team mentoring & best practices'],
  },
];

// Work availability, surfaced in the Services CTA.
export const availability = 'Available for full-time roles and freelance / contract work.';
