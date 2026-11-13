// Demo data for `npm run db:seed`. All companies and people are fictional.

// Departments come from db/05_reference_data.sql

export const RECRUITERS = [
  {
    key: 'novabyte',
    fullName: 'Priya Menon',
    email: 'hiring@novabyte.example.com',
    companyName: 'NovaByte Technologies',
    designation: 'Talent Acquisition Lead',
    companyWebsite: 'https://novabyte.example.com',
    companyDescription: 'Product company building cloud software for logistics and retail, 900+ engineers across Bengaluru and Pune.',
    verified: true,
  },
  {
    key: 'finlytics',
    fullName: 'Rahul Verma',
    email: 'careers@finlytics.example.com',
    companyName: 'Finlytics Analytics',
    designation: 'Campus Relations Manager',
    companyWebsite: 'https://finlytics.example.com',
    companyDescription: 'Fintech analytics firm providing credit-risk and fraud models to banks and NBFCs.',
    verified: true,
  },
  {
    key: 'voltaris',
    fullName: 'Ananya Iyer',
    email: 'campus@voltaris.example.com',
    companyName: 'Voltaris Semiconductors',
    designation: 'HR Business Partner',
    companyWebsite: 'https://voltaris.example.com',
    companyDescription: 'Fabless semiconductor company designing microcontrollers and power-management ICs.',
    verified: true,
  },
  {
    key: 'urbangrid',
    fullName: 'Vikram Rao',
    email: 'recruit@urbangrid.example.com',
    companyName: 'UrbanGrid Infrastructure',
    designation: 'Senior HR Manager',
    companyWebsite: 'https://urbangrid.example.com',
    companyDescription: 'EPC company delivering metro rail, commercial buildings and power distribution projects.',
    verified: true,
  },
  {
    key: 'cloudnest',
    fullName: 'Farhan Ali',
    email: 'talent@cloudnest.example.com',
    companyName: 'Cloudnest Systems',
    designation: 'Recruiter',
    companyWebsite: 'https://cloudnest.example.com',
    verified: false, // shows up in the admin verification queue
  },
];

// status: OPEN (approved), PENDING_APPROVAL (waiting for admin)
export const JOBS = [
  {
    key: 'backend',
    recruiter: 'novabyte',
    title: 'Backend Software Engineer',
    jobType: 'FULL_TIME',
    location: 'Bengaluru',
    ctcLpa: 14,
    minCgpa: 7.0,
    hiringQuota: 2,
    maxApplications: null,
    departments: ['CSE', 'IT'],
    requiredSkills: ['Java', 'Spring Boot', 'PostgreSQL', 'REST APIs', 'Docker', 'Data Structures'],
    description:
      'Join the Orders & Inventory platform team that processes two million shipments a day. You will design and build backend services, own their reliability in production and work closely with product managers to ship features end to end.',
    requirements:
      'Strong fundamentals in data structures, algorithms and object-oriented design. Experience building RESTful web services in Java or a similar language, writing SQL against a relational database such as PostgreSQL or MySQL, and packaging services with Docker. Familiarity with caching, message queues or microservice architecture is a plus.',
    status: 'OPEN',
  },
  {
    key: 'frontend',
    recruiter: 'novabyte',
    title: 'Frontend Engineer (React)',
    jobType: 'FULL_TIME',
    location: 'Pune',
    ctcLpa: 12,
    minCgpa: 6.5,
    hiringQuota: 1,
    maxApplications: null,
    departments: [],
    requiredSkills: ['React', 'JavaScript', 'TypeScript', 'CSS', 'Next.js'],
    description:
      'Build the merchant dashboard used by 40,000 retailers. You will turn Figma designs into fast, accessible interfaces, build reusable components and improve page performance.',
    requirements:
      'Hands-on experience with React and modern JavaScript or TypeScript, responsive CSS and consuming REST APIs. A portfolio of web projects is expected. Knowledge of accessibility, testing and Next.js server rendering is a plus.',
    status: 'OPEN',
  },
  {
    key: 'sre',
    recruiter: 'novabyte',
    title: 'Site Reliability Engineering Intern',
    jobType: 'INTERNSHIP_PPO',
    location: 'Remote',
    ctcLpa: 6,
    minCgpa: 7.0,
    hiringQuota: 1,
    maxApplications: 3, // the auto-close trigger fires on the 3rd application
    departments: ['CSE', 'IT', 'ECE'],
    requiredSkills: ['Linux', 'Kubernetes', 'Python', 'AWS', 'Monitoring'],
    description:
      'Six-month internship with a pre-placement offer. Help the platform team automate deployments, improve observability and run game-days on our Kubernetes clusters.',
    requirements:
      'Comfort with the Linux command line, scripting in Python or Bash, containers and at least one cloud provider. Interest in monitoring, incident response and infrastructure as code.',
    status: 'OPEN',
  },
  {
    key: 'datasci',
    recruiter: 'finlytics',
    title: 'Data Scientist — Credit Risk',
    jobType: 'FULL_TIME',
    location: 'Mumbai',
    ctcLpa: 16,
    minCgpa: 7.5,
    hiringQuota: 1,
    maxApplications: null,
    departments: [],
    requiredSkills: ['Python', 'Machine Learning', 'SQL', 'Statistics', 'Pandas', 'scikit-learn'],
    description:
      'Develop and validate credit-risk and default-prediction models for retail lending portfolios. Work with large tabular datasets, engineer features and explain model decisions to risk officers.',
    requirements:
      'Solid grounding in statistics and supervised machine learning (gradient boosting, logistic regression), Python data stack (Pandas, NumPy, scikit-learn) and SQL. Projects involving real-world tabular data or model explainability are valued.',
    status: 'OPEN',
  },
  {
    key: 'analyst',
    recruiter: 'finlytics',
    title: 'Business Data Analyst',
    jobType: 'FULL_TIME',
    location: 'Gurugram',
    ctcLpa: 9,
    minCgpa: 6.0,
    hiringQuota: 2,
    maxApplications: null,
    departments: [],
    requiredSkills: ['SQL', 'Excel', 'Power BI', 'Tableau', 'Python'],
    description:
      'Partner with sales and operations teams to answer business questions with data. Build dashboards, define KPIs and present insights to leadership every week.',
    requirements:
      'Strong SQL and spreadsheet skills, experience creating dashboards in Power BI or Tableau, and clear communication. Basic Python for data cleaning is a plus.',
    status: 'OPEN',
  },
  {
    key: 'firmware',
    recruiter: 'voltaris',
    title: 'Embedded Firmware Engineer',
    jobType: 'FULL_TIME',
    location: 'Hyderabad',
    ctcLpa: 11,
    minCgpa: 7.0,
    hiringQuota: 2,
    maxApplications: null,
    departments: ['ECE', 'EEE'],
    requiredSkills: ['Embedded C', 'ARM Cortex-M', 'RTOS', 'I2C', 'SPI'],
    description:
      'Write firmware and reference drivers for our low-power microcontroller family. Bring up new silicon on evaluation boards, debug with oscilloscopes and logic analysers, and support customers integrating our chips.',
    requirements:
      'Programming in C for microcontrollers, understanding of interrupts, timers and peripherals such as I2C, SPI and UART, and experience with an RTOS like FreeRTOS. Hardware debugging experience is expected.',
    status: 'OPEN',
  },
  {
    key: 'vlsi',
    recruiter: 'voltaris',
    title: 'VLSI Design Trainee',
    jobType: 'FULL_TIME',
    location: 'Bengaluru',
    ctcLpa: 10,
    minCgpa: 7.5,
    hiringQuota: 2,
    maxApplications: null,
    departments: ['ECE'],
    requiredSkills: ['Verilog', 'SystemVerilog', 'Digital Design', 'FPGA'],
    description:
      'RTL design and verification trainee programme for digital IP blocks. Train with senior engineers on synthesis, timing closure and UVM verification.',
    requirements:
      'Digital logic design, Verilog or SystemVerilog RTL coding and FPGA prototyping experience. Knowledge of computer architecture is a plus.',
    status: 'PENDING_APPROVAL',
  },
  {
    key: 'structures',
    recruiter: 'urbangrid',
    title: 'Graduate Engineer Trainee — Structures',
    jobType: 'FULL_TIME',
    location: 'Chennai',
    ctcLpa: 7,
    minCgpa: 6.5,
    hiringQuota: 2,
    maxApplications: null,
    departments: ['CE', 'ME'],
    requiredSkills: ['AutoCAD', 'STAAD Pro', 'Structural Analysis', 'Revit'],
    description:
      'Work on the design office team for metro stations and commercial towers. Prepare structural models, drawings and quantity estimates, and visit sites to support execution.',
    requirements:
      'Understanding of structural analysis and RCC/steel design codes, drafting in AutoCAD and modelling in STAAD Pro or ETABS. BIM tools such as Revit are a plus.',
    status: 'OPEN',
  },
  {
    key: 'power',
    recruiter: 'urbangrid',
    title: 'Power Systems Engineer',
    jobType: 'FULL_TIME',
    location: 'Chennai',
    ctcLpa: 8,
    minCgpa: 6.5,
    hiringQuota: 1,
    maxApplications: null,
    departments: ['EEE'],
    requiredSkills: ['Power Systems', 'MATLAB', 'ETAP', 'Protection'],
    description:
      'Design electrical distribution and substation systems for infrastructure projects: load-flow and short-circuit studies, relay coordination and equipment sizing.',
    requirements:
      'Knowledge of power system analysis, protection schemes and simulation tools such as ETAP or MATLAB/Simulink. Internship exposure to substations or utilities is valued.',
    status: 'OPEN',
  },
];

export const STUDENTS = [
  {
    key: 'aarav',
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@student.university.edu',
    roll: '21CSE001',
    dept: 'CSE',
    cgpa: 8.7,
    headline: 'Backend developer who enjoys designing scalable services and databases',
    skills: ['Java', 'Spring Boot', 'PostgreSQL', 'REST APIs', 'Docker', 'Redis', 'Data Structures'],
    projects: [
      {
        title: 'Campus Food Ordering Platform',
        summary:
          'Built a microservice backend with Spring Boot for ordering from campus canteens: order, menu and payment services communicating over REST, PostgreSQL for orders, Redis caching for menus and Docker Compose for local deployment. Handles 300 orders per lunch hour.',
        techStack: ['Java', 'Spring Boot', 'PostgreSQL', 'Redis', 'Docker'],
      },
      {
        title: 'Distributed Key-Value Store',
        summary:
          'Implemented a replicated key-value store in Java using the Raft consensus algorithm with leader election, log replication and snapshotting; benchmarked throughput under node failures.',
        techStack: ['Java', 'gRPC', 'Distributed Systems'],
      },
    ],
    resume:
      'Aarav Sharma, B.Tech Computer Science and Engineering, CGPA 8.7. Summary: backend engineer focused on Java and distributed systems. Experience: Software Engineering Intern at a logistics startup (summer) — built REST endpoints for shipment tracking in Spring Boot, wrote PostgreSQL queries and indexes that cut report latency by 60%, containerised services with Docker and added integration tests. Teaching assistant for Data Structures and Algorithms. Achievements: solved 600+ problems on competitive programming platforms, finalist in the institute hackathon. Skills: Java, Spring Boot, Hibernate, PostgreSQL, MySQL, Redis, Docker, Git, Linux, REST API design, object-oriented design, data structures and algorithms.',
  },
  {
    key: 'diya',
    fullName: 'Diya Patel',
    email: 'diya.patel@student.university.edu',
    roll: '21CSE014',
    dept: 'CSE',
    cgpa: 9.1,
    headline: 'Machine learning enthusiast working on vision and tabular risk models',
    skills: ['Python', 'Machine Learning', 'PyTorch', 'scikit-learn', 'Pandas', 'SQL', 'Statistics'],
    projects: [
      {
        title: 'Loan Default Prediction',
        summary:
          'Trained gradient-boosting and logistic-regression models on 250k loan records to predict default; engineered repayment-history features, handled class imbalance and explained predictions with SHAP values. Improved AUC from 0.71 to 0.83.',
        techStack: ['Python', 'XGBoost', 'scikit-learn', 'Pandas', 'SHAP'],
      },
      {
        title: 'Crop Disease Detection from Leaf Images',
        summary:
          'Fine-tuned a convolutional neural network in PyTorch to classify 38 plant diseases from leaf photographs with 96% accuracy and deployed it as a lightweight web demo.',
        techStack: ['PyTorch', 'Computer Vision', 'Flask'],
      },
    ],
    resume:
      'Diya Patel, B.Tech Computer Science, CGPA 9.1, department rank 2. Research intern at the institute data science lab: statistical analysis of agricultural yield data, regression modelling and hypothesis testing. Data Science Intern at a regional bank: built credit scoring features in SQL and Python, evaluated models with cross-validation and presented results to the risk team. Coursework: probability and statistics, machine learning, deep learning, database systems. Skills: Python, NumPy, Pandas, scikit-learn, XGBoost, PyTorch, SQL, data visualisation, A/B testing.',
  },
  {
    key: 'kabir',
    fullName: 'Kabir Singh',
    email: 'kabir.singh@student.university.edu',
    roll: '21CSE027',
    dept: 'CSE',
    cgpa: 7.4,
    headline: 'Frontend developer who cares about design systems and accessibility',
    skills: ['React', 'Next.js', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Figma', 'CSS'],
    projects: [
      {
        title: 'Placement Prep Dashboard',
        summary:
          'Designed and built a Next.js dashboard where students track coding practice and mock-interview scores, with charts, dark mode and server-side rendering. Used by 400 juniors.',
        techStack: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
      },
      {
        title: 'Accessible Component Library',
        summary:
          'Created a React component library with keyboard navigation, ARIA roles and visual regression tests; documented components in Storybook.',
        techStack: ['React', 'Storybook', 'Jest'],
      },
    ],
    resume:
      'Kabir Singh, B.Tech CSE. Frontend developer intern at a design agency: implemented responsive marketing websites from Figma, improved Lighthouse performance scores from 62 to 95 and built reusable UI components in React. Freelance web projects for local businesses. Skills: HTML, CSS, JavaScript, TypeScript, React, Next.js, Tailwind CSS, Redux, REST APIs, Figma, web accessibility, Git.',
  },
  {
    key: 'meera',
    fullName: 'Meera Nair',
    email: 'meera.nair@student.university.edu',
    roll: '21CSE033',
    dept: 'CSE',
    cgpa: 8.2,
    headline: 'Cloud and DevOps engineer automating everything with code',
    skills: ['Linux', 'Docker', 'Kubernetes', 'AWS', 'Terraform', 'Python', 'Prometheus'],
    projects: [
      {
        title: 'Self-healing Kubernetes Cluster Monitor',
        summary:
          'Set up Prometheus and Grafana monitoring for a Kubernetes cluster and wrote a Python operator that restarts unhealthy pods and posts alerts to chat; load-tested with chaos experiments.',
        techStack: ['Kubernetes', 'Prometheus', 'Grafana', 'Python'],
      },
    ],
    resume:
      'Meera Nair, B.Tech CSE, CGPA 8.2. Cloud intern: provisioned AWS infrastructure with Terraform, built CI/CD pipelines with GitHub Actions and reduced deployment time from 40 to 8 minutes. AWS Certified Cloud Practitioner. Skills: Linux administration, Bash and Python scripting, Docker, Kubernetes, Helm, AWS (EC2, S3, EKS), Terraform, monitoring with Prometheus, incident post-mortems.',
  },
  {
    key: 'rohan',
    fullName: 'Rohan Gupta',
    email: 'rohan.gupta@student.university.edu',
    roll: '21IT008',
    dept: 'IT',
    cgpa: 7.9,
    headline: 'Full-stack JavaScript developer',
    skills: ['Node.js', 'Express', 'React', 'MongoDB', 'PostgreSQL', 'REST APIs'],
    projects: [
      {
        title: 'Hostel Complaint Tracker',
        summary:
          'Full-stack web app for hostel maintenance requests with role-based access for students and wardens, built with Node.js, Express and PostgreSQL, React frontend and email notifications.',
        techStack: ['Node.js', 'Express', 'PostgreSQL', 'React'],
      },
    ],
    resume:
      'Rohan Gupta, B.Tech Information Technology. Built and deployed several full-stack applications using Node.js, Express, React and MongoDB/PostgreSQL. Web development intern: designed REST APIs, JWT authentication and SQL schemas for an e-commerce client. Skills: JavaScript, Node.js, Express, React, SQL, MongoDB, REST, Git, basic Docker.',
  },
  {
    key: 'sneha',
    fullName: 'Sneha Reddy',
    email: 'sneha.reddy@student.university.edu',
    roll: '21IT019',
    dept: 'IT',
    cgpa: 8.5,
    headline: 'Data analyst turning messy business data into clear dashboards',
    skills: ['SQL', 'Power BI', 'Excel', 'Python', 'Tableau', 'Statistics'],
    projects: [
      {
        title: 'Retail Sales Analytics Dashboard',
        summary:
          'Cleaned two years of point-of-sale data for a 12-store retail chain with SQL and Python, defined KPIs such as basket size and repeat rate, and built an interactive Power BI dashboard used in weekly reviews.',
        techStack: ['SQL', 'Power BI', 'Python', 'Excel'],
      },
    ],
    resume:
      'Sneha Reddy, B.Tech IT, CGPA 8.5. Business analytics intern at an FMCG distributor: wrote SQL queries for sales reporting, automated Excel reports with Python, and presented insights on regional demand to managers. Certifications: Microsoft Power BI Data Analyst. Skills: SQL, Excel (pivot tables, Power Query), Power BI, Tableau, Python (Pandas), descriptive statistics, stakeholder communication.',
  },
  {
    key: 'arjun',
    fullName: 'Arjun Mehta',
    email: 'arjun.mehta@student.university.edu',
    roll: '21IT025',
    dept: 'IT',
    cgpa: 6.8,
    headline: 'Android app developer',
    skills: ['Kotlin', 'Android', 'Java', 'Firebase'],
    projects: [
      {
        title: 'Bus Pass Android App',
        summary:
          'Android application in Kotlin for digital college bus passes with QR verification, Firebase authentication and offline support.',
        techStack: ['Kotlin', 'Android', 'Firebase'],
      },
    ],
    resume:
      'Arjun Mehta, B.Tech IT. Android developer with two published apps on the Play Store. Skills: Kotlin, Java, Android Jetpack, Firebase, REST API integration, Git. Volunteer at the coding club teaching Android basics.',
  },
  {
    key: 'ishaan',
    fullName: 'Ishaan Kulkarni',
    email: 'ishaan.kulkarni@student.university.edu',
    roll: '21ECE004',
    dept: 'ECE',
    cgpa: 8.4,
    headline: 'Embedded systems developer working close to the hardware',
    skills: ['Embedded C', 'ARM Cortex-M', 'FreeRTOS', 'RTOS', 'I2C', 'SPI', 'PCB Design'],
    projects: [
      {
        title: 'Smart Energy Meter with STM32',
        summary:
          'Designed a smart energy meter around an STM32 ARM Cortex-M4 microcontroller: wrote bare-metal and FreeRTOS firmware, I2C drivers for the metering IC, SPI flash logging and a two-layer PCB.',
        techStack: ['Embedded C', 'STM32', 'FreeRTOS', 'KiCad'],
      },
    ],
    resume:
      'Ishaan Kulkarni, B.Tech Electronics and Communication, CGPA 8.4. Embedded intern at an automotive electronics supplier: developed CAN and UART drivers in C, debugged timing issues with an oscilloscope and logic analyser. Robotics club lead: built a line-following robot with PID control. Skills: C, Embedded C, ARM Cortex-M, FreeRTOS, I2C, SPI, UART, interrupts and DMA, KiCad PCB design.',
  },
  {
    key: 'ananya',
    fullName: 'Ananya Joshi',
    email: 'ananya.joshi@student.university.edu',
    roll: '21ECE012',
    dept: 'ECE',
    cgpa: 8.9,
    headline: 'Digital design and VLSI enthusiast',
    skills: ['Verilog', 'SystemVerilog', 'FPGA', 'Digital Design', 'Computer Architecture'],
    projects: [
      {
        title: 'RISC-V 5-stage Pipeline on FPGA',
        summary:
          'Implemented a 5-stage pipelined RISC-V processor in Verilog with hazard detection and forwarding, verified with SystemVerilog testbenches and ran it on an FPGA board at 50 MHz.',
        techStack: ['Verilog', 'SystemVerilog', 'FPGA', 'Vivado'],
      },
    ],
    resume:
      'Ananya Joshi, B.Tech ECE, CGPA 8.9. VLSI design intern: wrote RTL for an AXI peripheral and verification testbenches, ran synthesis and static timing analysis. Skills: Verilog, SystemVerilog, digital logic design, FPGA prototyping (Xilinx Vivado), computer architecture, basic UVM.',
  },
  {
    key: 'tanvi',
    fullName: 'Tanvi Desai',
    email: 'tanvi.desai@student.university.edu',
    roll: '21ECE020',
    dept: 'ECE',
    cgpa: 7.6,
    headline: 'IoT developer combining sensors and machine learning',
    skills: ['Python', 'IoT', 'Raspberry Pi', 'MQTT', 'Machine Learning', 'Signal Processing'],
    projects: [
      {
        title: 'Wearable Fall Detection',
        summary:
          'Built a wrist-worn device with an accelerometer streaming data over MQTT to a Raspberry Pi gateway; trained a lightweight classifier to detect falls and send alerts to caregivers.',
        techStack: ['Python', 'MQTT', 'Raspberry Pi', 'scikit-learn'],
      },
    ],
    resume:
      'Tanvi Desai, B.Tech ECE. IoT and sensor networks enthusiast. Built multiple IoT prototypes with Raspberry Pi and ESP32, MQTT messaging and cloud dashboards. Skills: Python, C, signal processing, sensors, MQTT, Raspberry Pi, ESP32, basic machine learning.',
  },
  {
    key: 'aditya',
    fullName: 'Aditya Rao',
    email: 'aditya.rao@student.university.edu',
    roll: '21EEE006',
    dept: 'EEE',
    cgpa: 7.8,
    headline: 'Power systems engineer interested in grids and protection',
    skills: ['Power Systems', 'MATLAB', 'Simulink', 'ETAP', 'Protection', 'PLC'],
    projects: [
      {
        title: 'Microgrid Load-flow and Protection Study',
        summary:
          'Modelled a campus microgrid with solar PV and diesel generation in ETAP, ran load-flow and short-circuit studies and proposed relay coordination settings.',
        techStack: ['ETAP', 'MATLAB', 'Power Systems'],
      },
    ],
    resume:
      'Aditya Rao, B.Tech Electrical and Electronics Engineering, CGPA 7.8. Intern at a state electricity transmission utility: substation maintenance, protection relay testing and SCADA monitoring. Skills: power system analysis, MATLAB/Simulink, ETAP, relay coordination, PLC programming, AutoCAD Electrical.',
  },
  {
    key: 'pooja',
    fullName: 'Pooja Iyer',
    email: 'pooja.iyer@student.university.edu',
    roll: '21EEE015',
    dept: 'EEE',
    cgpa: 8.1,
    headline: 'Power electronics and battery-management firmware',
    skills: ['Embedded C', 'Power Electronics', 'MATLAB', 'CAN', 'Battery Management Systems'],
    projects: [
      {
        title: 'Battery Management System for an Electric Two-Wheeler',
        summary:
          'Designed a BMS for a 48 V lithium-ion pack: cell-voltage monitoring over SPI, state-of-charge estimation with a Kalman filter in Embedded C, and CAN messages to the motor controller.',
        techStack: ['Embedded C', 'CAN', 'MATLAB', 'Power Electronics'],
      },
    ],
    resume:
      'Pooja Iyer, B.Tech EEE, CGPA 8.1. Member of the Formula Student electric team: battery pack design and firmware. Skills: power electronics, DC-DC converters, Embedded C on microcontrollers, CAN bus, MATLAB/Simulink, battery modelling.',
  },
  {
    key: 'karan',
    fullName: 'Karan Malhotra',
    email: 'karan.malhotra@student.university.edu',
    roll: '21ME010',
    dept: 'ME',
    cgpa: 7.2,
    headline: 'Mechanical design engineer with a motorsport background',
    skills: ['SolidWorks', 'AutoCAD', 'ANSYS', 'CATIA', 'GD&T'],
    projects: [
      {
        title: 'Lightweight Chassis for SAE BAJA',
        summary:
          'Designed the roll-cage of an off-road vehicle in SolidWorks, validated it with finite-element analysis in ANSYS and reduced weight by 12% while meeting safety factors.',
        techStack: ['SolidWorks', 'ANSYS', 'FEA'],
      },
    ],
    resume:
      'Karan Malhotra, B.Tech Mechanical Engineering. Design lead of the SAE BAJA team. Intern at an auto-components manufacturer: created 3D models and drawings with GD&T. Skills: SolidWorks, CATIA, AutoCAD, ANSYS structural analysis, manufacturing processes.',
  },
  {
    key: 'nikhil',
    fullName: 'Nikhil Verma',
    email: 'nikhil.verma@student.university.edu',
    roll: '21ME018',
    dept: 'ME',
    cgpa: 6.9,
    headline: 'Manufacturing engineer who loves data-driven process improvement',
    skills: ['Lean Manufacturing', 'Six Sigma', 'Excel', 'SQL', 'Python'],
    projects: [
      {
        title: 'OEE Analytics for a Machining Line',
        summary:
          'Collected machine downtime logs, analysed overall equipment effectiveness with Python and SQL, and built an Excel dashboard that helped cut changeover time by 18%.',
        techStack: ['Python', 'SQL', 'Excel'],
      },
    ],
    resume:
      'Nikhil Verma, B.Tech Mechanical. Six Sigma Green Belt. Plant intern: time studies, root-cause analysis and Kaizen events. Skills: lean manufacturing, Six Sigma, Excel, SQL, Python for data analysis, process mapping.',
  },
  {
    key: 'riya',
    fullName: 'Riya Kapoor',
    email: 'riya.kapoor@student.university.edu',
    roll: '21CE003',
    dept: 'CE',
    cgpa: 8.0,
    headline: 'Structural engineer passionate about high-rise design',
    skills: ['AutoCAD', 'STAAD Pro', 'ETABS', 'Revit', 'Structural Analysis'],
    projects: [
      {
        title: 'G+5 Residential Building Design',
        summary:
          'Complete structural design of a six-storey RCC residential building: load calculations, analysis in STAAD Pro, design of beams, columns and footings per IS 456, and drawings in AutoCAD.',
        techStack: ['STAAD Pro', 'AutoCAD', 'IS 456'],
      },
    ],
    resume:
      'Riya Kapoor, B.Tech Civil Engineering, CGPA 8.0. Intern with a structural consultancy: modelled commercial buildings in ETABS, prepared reinforcement drawings and BIM models in Revit. Skills: structural analysis, RCC and steel design, STAAD Pro, ETABS, AutoCAD, Revit, quantity estimation.',
  },
  {
    key: 'siddharth',
    fullName: 'Siddharth Jain',
    email: 'siddharth.jain@student.university.edu',
    roll: '21CE011',
    dept: 'CE',
    cgpa: 7.0,
    headline: 'Transportation engineering and GIS',
    skills: ['AutoCAD', 'QGIS', 'Transportation Engineering', 'Surveying'],
    projects: [
      {
        title: 'Traffic Signal Optimisation',
        summary:
          'Surveyed traffic volumes at three city intersections, modelled them in a traffic simulator and proposed signal timings that reduced average delay by 22%.',
        techStack: ['QGIS', 'Traffic Simulation', 'Excel'],
      },
    ],
    resume:
      'Siddharth Jain, B.Tech Civil. Interests: transportation planning, highway design and GIS. Skills: AutoCAD, QGIS, total-station surveying, traffic studies, highway geometric design.',
  },
  {
    key: 'zara',
    fullName: 'Zara Khan',
    email: 'zara.khan@student.university.edu',
    roll: '21CSE045',
    dept: 'CSE',
    cgpa: 8.0,
    headline: 'Python web developer',
    skills: ['Python', 'Django', 'PostgreSQL'],
    projects: [],
    resume:
      'Zara Khan, B.Tech CSE. Built Django web applications with PostgreSQL. Skills: Python, Django, HTML, CSS, SQL.',
    verified: false, // shows up in the admin verification queue
  },
];
