import React from "react";
import { notFound } from "next/navigation";
import { projectsData, ProjectItem } from "@/data/about";
import { getPageSection } from "@/features/website-cms/actions/content-actions";
import { 
  ArrowLeft, Calendar, User, Tag, 
  Sun, Zap, Cpu, Settings, Bot, Layout, Droplet, Percent, Leaf, BatteryCharging, 
  ArrowRight, FileText, BarChart, Code, FileSymlink
} from "lucide-react";
import Link from "next/link";
import { ProjectResources } from "@/components/about/ProjectResources";

interface ProjectDetailsProps {
  params: Promise<{
    id: string;
  }>;
}

const getIcon = (name: string, className: string = "w-5 h-5") => {
  switch (name) {
    case "Sun": return <Sun className={className} />;
    case "Zap": return <Zap className={className} />;
    case "Cpu": return <Cpu className={className} />;
    case "Settings": return <Settings className={className} />;
    case "Bot": return <Bot className={className} />;
    case "Droplet": return <Droplet className={className} />;
    case "Percent": return <Percent className={className} />;
    case "Leaf": return <Leaf className={className} />;
    case "BatteryCharging": return <BatteryCharging className={className} />;
    case "ArrowRight": return <ArrowRight className={className} />;
    case "FileText": return <FileText className={className} />;
    case "BarChart": return <BarChart className={className} />;
    case "Code": return <Code className={className} />;
    case "FileSymlink": return <FileSymlink className={className} />;
    case "Layout": return <Layout className={className} />;
    default: return <div className={`rounded-full bg-current ${className}`} />;
  }
};

export default async function ProjectDetailsPage({ params }: ProjectDetailsProps) {
  const { id } = await params;
  
  // Fetch dynamic projects data from CMS
  const aboutProjectsSection = await getPageSection("ABOUT", "ABOUT_PROJECTS");
  const projectsList: ProjectItem[] = aboutProjectsSection?.content?.projects || projectsData;
  
  const project = projectsList.find((p: ProjectItem) => p.id === id);

  if (!project) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FFF9F2] pt-24 pb-16 selection:bg-accent selection:text-primary">
      {/* Background Vectors */}
      <div className="absolute top-0 left-0 opacity-10 pointer-events-none -translate-x-1/4 -translate-y-1/4">
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="100" stroke="#FBB503" strokeWidth="2" strokeDasharray="10 10"/>
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm font-bold mb-8">
          <Link href="/about" className="text-primary/60 hover:text-primary transition-colors flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Portfolio
          </Link>
          <span className="text-primary/30">/</span>
          <Link href="/about" className="text-primary/60 hover:text-primary transition-colors">
            Projects
          </Link>
          <span className="text-primary/30">/</span>
          <span className="text-primary truncate max-w-[200px] sm:max-w-xs">{project.title}</span>
        </nav>

        <div className="bg-white rounded-3xl border border-[#E7E0D2] shadow-sm overflow-hidden flex flex-col">
          
          {/* Hero Image */}
          <div className="w-full h-64 sm:h-80 md:h-[400px] relative">
            <img 
              src={project.imageUrl} 
              alt={project.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
            
            <div className="absolute bottom-0 left-0 w-full p-6 sm:p-10 flex flex-col justify-end">
              <div className="flex items-center space-x-2 bg-accent/90 text-primary font-black text-xs uppercase tracking-widest px-3 py-1.5 rounded w-fit mb-4">
                {getIcon(project.iconName, "w-4 h-4")}
                <span>{project.category}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white !text-white font-display leading-tight max-w-4xl drop-shadow-md">
                {project.title}
              </h1>
            </div>
          </div>

          {/* Content Layout */}
          <div className="flex flex-col lg:flex-row">
            
            {/* Left Column: Description */}
            <div className="flex-1 p-6 sm:p-10 border-b lg:border-b-0 lg:border-r border-[#E7E0D2]/50">
              <h2 className="text-2xl font-extrabold text-primary mb-6">Project Overview</h2>
              <div className="prose prose-lg text-primary/80">
                <p className="font-medium text-lg leading-relaxed mb-6">
                  {project.shortDescription}
                </p>
                {project.fullDescription && (
                  <p className="leading-relaxed">
                    {project.fullDescription}
                  </p>
                )}
                
                {/* Fallback dummy text if no full description is provided */}
                {!project.fullDescription && (
                  <p className="leading-relaxed opacity-70">
                    Detailed technical documentation, implementation strategies, and outcome analysis for this project are currently being compiled. This section will be updated with comprehensive insights into the methodologies, challenges overcome, and the ultimate impact of the developed solution.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Sidebar */}
            <div className="w-full lg:w-[380px] shrink-0 p-6 sm:p-10 flex flex-col gap-10 bg-[#FFF9F2]/60 border-t lg:border-t-0 lg:border-l border-[#E7E0D2]/50">
              
              {/* Technologies */}
              {project.technologies && project.technologies.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold text-primary uppercase tracking-widest mb-4 flex items-center">
                    <Code className="w-4 h-4 mr-2 text-accent" />
                    Technologies Used
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map(tech => (
                      <span key={tech} className="px-3 py-1.5 bg-white text-primary text-xs font-bold rounded-md border border-[#E7E0D2] shadow-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics / Highlights */}
              {project.metrics && project.metrics.length > 0 && (
                <div>
                  <h3 className="text-sm font-extrabold text-primary uppercase tracking-widest mb-4 flex items-center">
                    <BarChart className="w-4 h-4 mr-2 text-accent" />
                    Key Highlights
                  </h3>
                  <div className="space-y-3">
                    {project.metrics.map((metric, idx) => (
                      <div key={idx} className="flex items-center p-4 bg-white rounded-xl border border-[#E7E0D2] shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mr-4 shrink-0">
                          {getIcon(metric.iconName, "w-5 h-5")}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-primary font-extrabold">{metric.value}</span>
                          <span className="text-primary/50 text-[10px] font-black uppercase tracking-widest">{metric.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Links */}
              {project.actionLinks && project.actionLinks.length > 0 && (
                <ProjectResources links={project.actionLinks} />
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
