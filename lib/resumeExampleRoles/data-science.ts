import { RolePageData } from "./types";
import { DEFAULT_CORE_SECTION_ORDER } from "@/components/TemplateBuilder/types";

export const dataScienceData: RolePageData = {
  slug: "data-science",
  title: "Data Scientist",
  category: "Data Science",
  pageTitle: "5 Data Scientist Resume Examples & Writing Tips for 2025",
  metaDescription: "Browse professionally written Data Scientist resume examples. Learn how to showcase machine learning models, Python/SQL expertise, A/B testing, and business impact.",
  
  marketInsights: {
    medianSalary: "$115,000 – $165,000",
    education: "Master's or Ph.D. in CS, Statistics, Math, or Data Science",
    yearsExperience: "2–8+ years",
    workStyle: "Remote / Hybrid",
    careerPath: "Data Analyst → Data Scientist → Senior Data Scientist → Lead DS / ML Engineer → Director of Data Science",
    certifications: ["AWS Certified Machine Learning", "TensorFlow Developer Certificate", "Google Professional Data Engineer"],
  },

  examples: [
    {
      id: "ds-senior-ml",
      persona: {
        name: "Dr. Aris Thorne",
        location: "San Francisco, CA",
        email: "aris.thorne@email.com",
      },
      headline: "Senior Data Scientist & ML Engineer",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#0284c7", stylePreset: "azurill", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Dr. Aris Thorne", 
          email: "aris.thorne@email.com", 
          phone: "(415) 555-0177", 
          location: "San Francisco, CA", 
          website: "aristhorne.ai", 
          linkedin: "linkedin.com/in/aristhorne-ds", 
          github: "github.com/athorne-ds", 
          summary: "Senior Data Scientist with a Ph.D. in Computer Science and 6+ years of experience designing, deploying, and scaling machine learning models in production. Specialist in predictive modeling, NLP, and deep learning using Python, PyTorch, and Spark. Deployed predictive customer churn model that saved $3.2M in ARR."
        },
        workExperiences: [
          { 
            id: "ds-we-1", 
            company: "OmniData AI", 
            jobTitle: "Senior Data Scientist", 
            location: "San Francisco, CA", 
            startDate: "Feb 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Architected and deployed a XGBoost-based customer churn prediction model in Python/AWS SageMaker, boosting customer retention by 14% and preserving $3.2M in annual recurring revenue.\nDesigned large-scale NLP feature extraction pipelines using PyTorch and Hugging Face Transformers, improving semantic search accuracy across 10M+ documents by 22%.\nMentored 3 junior data scientists and established team-wide MLOps standards using MLflow, Docker, and CI/CD pipelines.\nPartnered with Product Leaders to design 40+ rigorous A/B experiments, defining statistical power parameters and analyzing sample variance." 
          },
          { 
            id: "ds-we-2", 
            company: "Insight Analytics Corp", 
            jobTitle: "Data Scientist", 
            location: "San Jose, CA", 
            startDate: "Jul 2018", 
            endDate: "Jan 2021", 
            current: false, 
            bullets: "Built recommendation engine algorithms using collaborative filtering and PySpark, driving a 19% increase in click-through rate across 2M daily active users.\nRefactored legacy SQL queries and Pandas data cleaning scripts, cutting ETL pipeline processing time from 6 hours to 45 minutes." 
          }
        ],
        educations: [
          { 
            id: "ds-ed-1", 
            school: "Stanford University", 
            degree: "Ph.D. Computer Science (Machine Learning)", 
            location: "Stanford, CA", 
            startDate: "Sep 2014", 
            endDate: "Jun 2018", 
            gpa: "3.95", 
            coursework: "Deep Learning, Statistical Learning Theory, Distributed Systems, Probabilistic Graphical Models" 
          }
        ],
        projects: [
          {
            id: "ds-proj-1",
            name: "Neural Text Summarizer",
            tech: "Python, PyTorch, Transformers",
            link: "github.com/athorne-ds/text-summarizer",
            date: "2023",
            bullets: "Created an open-source Transformer fine-tuning pipeline for domain-specific medical literature summarization with 1.2k GitHub stars."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Python / PyTorch / TensorFlow", rating: 5 },
            { skill: "Machine Learning / Deep Learning", rating: 5 },
            { skill: "SQL / PySpark / Snowflake", rating: 5 },
            { skill: "AWS SageMaker / MLOps", rating: 4 },
            { skill: "A/B Testing & Experimentation", rating: 5 },
            { skill: "NLP / Large Language Models", rating: 4 }
          ],
          descriptions: "Languages & Frameworks: Python, SQL, R, PyTorch, TensorFlow, Scikit-Learn, PySpark, Pandas, NumPy\nML & Stats: Supervised/Unsupervised ML, Deep Learning, NLP, Time-Series Forecasting, A/B Testing, Hypothesis Testing\nData & Cloud: AWS (SageMaker, S3, Redshift), Snowflake, Databricks, Docker, MLflow, Git"
        }
      },
      critique: "A top-tier Senior Data Scientist resume. It balances academic rigor (Ph.D. from Stanford) with commercial production impact ($3.2M ARR preserved, 14% retention increase). Shows strong full-lifecycle competency from model creation to MLOps deployment."
    },
    {
      id: "ds-product-analytics",
      persona: {
        name: "Sofia Chen",
        location: "Seattle, WA",
        email: "sofia.chen@email.com",
      },
      headline: "Product Data Scientist",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#059669", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Sofia Chen", 
          email: "sofia.chen@email.com", 
          phone: "(206) 555-0143", 
          location: "Seattle, WA", 
          website: "", 
          linkedin: "linkedin.com/in/sofiachen-ds", 
          github: "github.com/sofiachen-data", 
          summary: "Product-focused Data Scientist with 4+ years of experience turning complex user behavioral data into actionable product features. Advanced proficiency in SQL, Python, Mixpanel, and experimental design. Led A/B testing strategy that unlocked a $1.8M ARR expansion."
        },
        workExperiences: [
          { 
            id: "ds-we-3", 
            company: "CloudStream Video", 
            jobTitle: "Product Data Scientist", 
            location: "Seattle, WA", 
            startDate: "Aug 2021", 
            endDate: "Present", 
            current: true, 
            bullets: "Formulated and evaluated 25+ product A/B tests using Python and Snowflake, directly driving a 12% improvement in 30-day user retention.\nConstructed automated Tableau and Looker executive dashboards tracking key performance metrics (DAU/MAU, LTV, CAC, Churn) for 5 distinct product teams.\nUtilized K-Means clustering algorithms to segment 4M active users, enabling personalized email campaign targeting that increased conversion by 18%." 
          },
          { 
            id: "ds-we-4", 
            company: "MetricsLab Consulting", 
            jobTitle: "Data Analyst / Data Scientist", 
            location: "Seattle, WA", 
            startDate: "Jun 2019", 
            endDate: "Jul 2021", 
            current: false, 
            bullets: "Wrote complex SQL queries involving window functions and CTEs to extract cohort retention insights from multi-terabyte databases.\nDeveloped automated anomaly detection scripts in Python to alert engineering teams of telemetry data outages." 
          }
        ],
        educations: [
          { 
            id: "ds-ed-2", 
            school: "University of Washington", 
            degree: "M.S. Applied Mathematics & Statistics", 
            location: "Seattle, WA", 
            startDate: "Sep 2017", 
            endDate: "Jun 2019", 
            gpa: "3.88", 
            coursework: "Applied Statistics, Predictive Analytics, Linear Algebra, Time Series Analysis" 
          }
        ],
        projects: [
          {
            id: "ds-proj-2",
            name: "Customer LTV Prediction Pipeline",
            tech: "Python, Scikit-Learn, Streamlit",
            link: "",
            date: "2023",
            bullets: "Built a web app powered by a Random Forest regression model to predict 12-month customer lifetime value based on early user onboarding behavior."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "SQL (Complex Queries / Window Functions)", rating: 5 },
            { skill: "Python (Pandas / Statsmodels)", rating: 5 },
            { skill: "A/B Testing & Experimentation", rating: 5 },
            { skill: "Tableau / Looker Dashboarding", rating: 5 },
            { skill: "Customer Clustering & Segmentation", rating: 4 },
            { skill: "Snowflake / Redshift", rating: 4 }
          ],
          descriptions: "Technical Stack: Python (Pandas, NumPy, Scikit-Learn, Statsmodels, Seaborn), SQL, R, Snowflake, BigQuery\nAnalytics & BI: A/B Testing, Hypothesis Testing, Cohort Analysis, Funnel Analysis, Looker, Tableau, Mixpanel, Amplitude"
        }
      },
      critique: "An ideal resume for Product Data Science roles. It emphasizes user experimentation, A/B testing rigor, cohort analysis, and executive dashboarding alongside core SQL and Python skills."
    },
    {
      id: "ds-entry-level",
      persona: {
        name: "Alex Rivera",
        location: "Boston, MA",
        email: "alex.rivera@email.com",
      },
      headline: "Junior Data Scientist",
      resumeData: {
        customization: { font: "Helvetica", accentColor: "#7c3aed", stylePreset: "modern", pageWidth: "standard", fontSize: "medium", layout: "single" },
        sectionOrder: [...DEFAULT_CORE_SECTION_ORDER],
        hiddenSections: [],
        customSections: [],
        profile: {
          name: "Alex Rivera", 
          email: "alex.rivera@email.com", 
          phone: "(617) 555-0199", 
          location: "Boston, MA", 
          website: "", 
          linkedin: "linkedin.com/in/alexrivera-ds", 
          github: "github.com/arivera-data", 
          summary: "Entry-level Data Scientist with a Master's degree in Data Science and hands-on internship experience building predictive machine learning models in Python and R. Strong foundation in statistical inference, SQL data modeling, and data visualization."
        },
        workExperiences: [
          { 
            id: "ds-we-5", 
            company: "BioHealth Analytics", 
            jobTitle: "Data Science Intern", 
            location: "Boston, MA", 
            startDate: "May 2023", 
            endDate: "Dec 2023", 
            current: false, 
            bullets: "Cleaned and processed 500k+ clinical trial records using Python (Pandas), reducing missing value anomalies by 95%.\nBuilt classification models (Random Forest, Logistic Regression) to predict patient non-attendance rates with 84% accuracy.\nPresented visual findings to clinical operations team using Matplotlib and Seaborn graphs." 
          }
        ],
        educations: [
          { 
            id: "ds-ed-3", 
            school: "Northeastern University", 
            degree: "M.S. Data Science", 
            location: "Boston, MA", 
            startDate: "Sep 2022", 
            endDate: "May 2024", 
            gpa: "3.75", 
            coursework: "Algorithms for Data Science, Data Mining, Machine Learning, Database Management" 
          }
        ],
        projects: [
          {
            id: "ds-proj-3",
            name: "Housing Price Prediction Web App",
            tech: "Python, Scikit-Learn, Flask",
            link: "github.com/arivera-data/house-price-predictor",
            date: "2024",
            bullets: "Scraped 10,000 real estate listings using BeautifulSoup, trained a Gradient Boosting model, and deployed an interactive Flask app."
          },
          {
            id: "ds-proj-4",
            name: "Sentiment Analysis on Movie Reviews",
            tech: "Python, NLTK, TF-IDF",
            link: "github.com/arivera-data/sentiment-nlp",
            date: "2023",
            bullets: "Implemented TF-IDF and Naive Bayes classifiers to categorize sentiment across 50k IMDB reviews with 88% precision."
          }
        ],
        skills: {
          featuredSkills: [
            { skill: "Python (Pandas / Scikit-Learn)", rating: 5 },
            { skill: "SQL Querying", rating: 4 },
            { skill: "Statistical Analysis", rating: 4 },
            { skill: "Machine Learning Basics", rating: 4 },
            { skill: "Data Scraping (BeautifulSoup)", rating: 4 },
            { skill: "Git / GitHub", rating: 4 }
          ],
          descriptions: "Programming: Python, SQL, R, HTML/CSS\nLibraries: Pandas, NumPy, Scikit-Learn, NLTK, BeautifulSoup, Matplotlib, Seaborn, Flask\nTools: Jupyter Notebooks, Git, GitHub, MySQL, PostgreSQL"
        }
      },
      critique: "A solid entry-level Data Science resume that leverages strong academic projects, end-to-end Web App deployments, and clean data processing internship experience to prove hands-on capability."
    }
  ],

  writingGuide: {
    intro: "Writing a Data Science resume requires blending advanced technical capability (Python, R, SQL, Machine Learning) with tangible business results. Recruiters want to know not just what models you trained, but why they mattered to the business bottom line.",
    tips: [
      "Quantify your model performance AND business metrics (e.g., '84% accuracy resulting in $1.2M cost savings').",
      "Detail your technical stack explicitly (e.g., 'PyTorch, XGBoost, SageMaker, Snowflake').",
      "Distinguish between exploratory analysis/dashboarding and production machine learning model deployment.",
      "Link your GitHub or personal portfolio site so hiring managers can inspect your code and notebooks."
    ],
    headlineExamples: [
      {
        strong: "Senior Data Scientist | Machine Learning & PyTorch | $3M+ Revenue Impact",
        weak: "Data Scientist passionate about AI",
        explanation: "The strong headline highlights seniority, core framework expertise, and financial scale of impact."
      }
    ],
    summaryExamples: [
      {
        strong: "Data Scientist with 5+ years of experience developing predictive machine learning models and high-throughput data pipelines in Python and SQL. Deployed churn and recommendation models serving 5M+ daily users.",
        weak: "Hardworking data science graduate with passion for machine learning and deep learning algorithms looking for a role.",
        explanation: "The strong summary shows real-world deployment experience and user scale."
      }
    ],
    bulletGuidance: "Use the pattern: Algorithm/Tool + Data Scale + Business Outcome. Example: 'Architected an XGBoost customer churn model in Python/SageMaker, boosting retention by 14% and saving $3.2M ARR.'",
    expertQuote: "A great data scientist resume proves you understand business problems, not just algorithm math. Show me how your model changed a business decision.",
    faq: [
      {
        q: "Is a Master's degree or Ph.D. required for Data Science?",
        a: "While many senior and research DS roles prefer an advanced degree, a strong portfolio of production ML projects and demonstrable SQL/Python mastery can land roles without a Ph.D."
      },
      {
        q: "How should I present GitHub projects?",
        a: "Include clean README files, well-commented Jupyter Notebooks, and live app links (Streamlit/HuggingFace Spaces) in a dedicated Projects section."
      }
    ],
    relatedRoles: [
      { title: "Machine Learning Engineer", slug: "ml-engineer" },
      { title: "Data Analyst", slug: "data-analyst" },
      { title: "Data Engineer", slug: "data-engineer" },
      { title: "AI Research Scientist", slug: "ai-research-scientist" }
    ]
  }
};
