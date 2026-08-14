import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// Comprehensive skills dictionary — phrase-first (longer phrases matched before shorter words)
const SKILLS: string[] = [
  // Frameworks & stacks (multi-word first)
  "React Native","Spring Boot","Spring MVC","Spring Security","Spring Cloud",
  "Next.js","Nuxt.js","Vue.js","Node.js","Express.js","NestJS","ASP.NET Core",
  ".NET Core","ASP.NET","FastAPI","Ruby on Rails","Tailwind CSS","Material UI",
  "Ant Design","Testing Library","GitHub Actions","GitLab CI","Google Cloud",
  "Machine Learning","Deep Learning","Natural Language Processing","NLP",
  "Domain-Driven Design","Event-Driven","Test-Driven Development","Behaviour-Driven Development",
  "Jetpack Compose","Clean Architecture","Design Patterns","Functional Programming",
  "Object-Oriented Programming","Apache Kafka","Apache Spark","Apache Hadoop",
  "CI/CD","Power BI","REST API","RESTful API","GraphQL API",
  // Languages
  "JavaScript","TypeScript","Python","Java","Kotlin","Swift","Go","Golang","Rust",
  "C#","C++","PHP","Ruby","Scala","Perl","Bash","Shell","PowerShell","SQL","R",
  "MATLAB","Dart","Elixir","Clojure","Haskell","Lua","Groovy",
  // Frontend
  "React","Angular","Vue","Svelte","Redux","MobX","Zustand","Webpack","Vite",
  "Babel","HTML","CSS","SASS","SCSS","Bootstrap","jQuery","Remix","Astro",
  "Storybook","Figma","Sketch",
  // Backend
  "Django","Flask","Rails","Laravel","Symfony","Gin","Echo","Fiber","Hibernate",
  "JPA","JDBC","gRPC","GraphQL","REST","WebSockets","OAuth","JWT","SAML",
  "Microservices","Serverless","Lambda","Kafka","RabbitMQ","Celery","Sidekiq",
  // Cloud & DevOps
  "AWS","Azure","GCP","Kubernetes","Docker","Terraform","Ansible","Puppet","Chef",
  "Jenkins","CircleCI","ArgoCD","Helm","Istio","Prometheus","Grafana","Elasticsearch",
  "Logstash","Kibana","CloudFormation","CDK","EC2","S3","EKS","ECS","RDS","Aurora",
  "Lambda","SQS","SNS","API Gateway","CloudFront","Route 53","VPC","IAM",
  "Heroku","Vercel","Netlify","DigitalOcean","Cloudflare",
  // Databases
  "PostgreSQL","MySQL","MongoDB","Redis","Cassandra","DynamoDB","SQLite","MariaDB",
  "Oracle","SQL Server","CouchDB","Neo4j","InfluxDB","Snowflake","BigQuery",
  "Redshift","Databricks","Firebase","Firestore","PlanetScale","Supabase","Neon",
  // Data & AI
  "TensorFlow","PyTorch","Keras","scikit-learn","Pandas","NumPy","Matplotlib",
  "Seaborn","Airflow","dbt","Tableau","Looker","Spark","Hadoop","Kafka",
  "MLflow","Jupyter","LangChain","OpenAI","Hugging Face","Vertex AI","SageMaker",
  // Testing
  "Jest","Cypress","Selenium","JUnit","TestNG","Pytest","Mocha","Chai","Playwright",
  "Vitest","Jasmine","Mockito","Enzyme","Supertest","k6","Locust",
  // Mobile
  "iOS","Android","Flutter","SwiftUI","Xamarin","Expo","Capacitor",
  // Security
  "Cybersecurity","OWASP","Penetration Testing","Ethical Hacking","SOC 2","GDPR",
  "ISO 27001","Zero Trust","SIEM","WAF","PKI","RBAC","ABAC",
  // Architecture
  "Microservices","Monolith","CQRS","Event Sourcing","Saga Pattern","DDD","BFF",
  "Service Mesh","API Gateway","Pub/Sub","Message Queue",
  // Agile / Process
  "Agile","Scrum","Kanban","SAFe","DevOps","SRE","Platform Engineering",
  "SOLID","Clean Code","Code Review","Pair Programming","TDD","BDD",
  // Tools
  "Git","GitHub","GitLab","Bitbucket","Jira","Confluence","VS Code","IntelliJ",
  "Eclipse","Postman","Swagger","OpenAPI","Linux","Unix","macOS","Nginx","Apache",
  "Kafka Connect","Debezium","Flyway","Liquibase","Gradle","Maven","npm","pnpm","Yarn",
];

// Build a lowercase lookup → canonical
const SKILLS_MAP = new Map<string, string>(SKILLS.map((s) => [s.toLowerCase(), s]));

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bodyHtml } = await request.json().catch(() => ({ bodyHtml: "" }));
  if (!bodyHtml) return NextResponse.json({ skills: [] });

  const text = " " + stripHtml(bodyHtml).toLowerCase() + " ";

  const found: string[] = [];
  for (const [lower, canonical] of SKILLS_MAP) {
    // Match whole-word (surrounded by non-alphanumeric chars)
    const pattern = new RegExp(`[^a-z0-9]${lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s/,-]+")}[^a-z0-9]`);
    if (pattern.test(text)) {
      found.push(canonical);
    }
  }

  // Sort alphabetically, limit to 30
  found.sort((a, b) => a.localeCompare(b));
  return NextResponse.json({ skills: found.slice(0, 30) });
}
