import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { reportAPI, projectAPI } from '../services/api';
import {
  ChartBarIcon,
  ClockIcon,
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import ProjectProgressReport from '../components/Reports/ProjectProgressReport';
import TimeUtilizationReport from '../components/Reports/TimeUtilizationReport';
import TaskMetricsReport from '../components/Reports/TaskMetricsReport';

export default function Reports() {
  const { projectId } = useParams();
  const [activeReport, setActiveReport] = useState('progress');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(projectId || '');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (projectId) {
      setSelectedProject(projectId);
    }
  }, [projectId]);

  const loadProjects = async () => {
    try {
      const response = await projectAPI.getAll();
      setProjects(response.data.data.projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleExport = async (format) => {
    if (!selectedProject && activeReport !== 'time') {
      toast.error('Please select a project');
      return;
    }

    setLoading(true);
    try {
      let response;
      const params = {
        ...dateRange,
        projectId: selectedProject,
      };

      switch (activeReport) {
        case 'progress':
          response =
            format === 'pdf'
              ? await reportAPI.exportProjectProgressPDF(selectedProject)
              : await reportAPI.exportProjectProgressCSV(selectedProject);
          break;
        case 'time':
          response =
            format === 'pdf'
              ? await reportAPI.exportTimeUtilizationPDF(params)
              : await reportAPI.exportTimeUtilizationCSV(params);
          break;
        case 'tasks':
          response =
            format === 'pdf'
              ? await reportAPI.exportTaskMetricsPDF(selectedProject, dateRange)
              : await reportAPI.exportTaskMetricsCSV(selectedProject, dateRange);
          break;
        default:
          return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${activeReport}-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export report');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const reportTypes = [
    {
      id: 'progress',
      name: 'Project Progress',
      icon: ChartBarIcon,
      description: 'Overview of project status, tasks, and milestones',
    },
    {
      id: 'time',
      name: 'Time Utilization',
      icon: ClockIcon,
      description: 'Time tracking analysis by project and user',
    },
    {
      id: 'tasks',
      name: 'Task Metrics',
      icon: DocumentChartBarIcon,
      description: 'Task statistics by priority, status, and assignee',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports & Analytics</h1>

          {/* Report Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveReport(type.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  activeReport === type.id
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <type.icon
                  className={`w-6 h-6 mb-2 ${
                    activeReport === type.id ? 'text-primary-600' : 'text-gray-400'
                  }`}
                />
                <h3 className="font-semibold text-gray-900">{type.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{type.description}</p>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Project Selection */}
            {activeReport !== 'time' && (
              <div className="flex-1 min-w-[200px]">
                <label className="label">Project</label>
                <select
                  className="input"
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            {(activeReport === 'time' || activeReport === 'tasks') && (
              <>
                <div className="flex-1 min-w-[150px]">
                  <label className="label">Start Date</label>
                  <input
                    type="date"
                    className="input"
                    value={dateRange.startDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="label">End Date</label>
                  <input
                    type="date"
                    className="input"
                    value={dateRange.endDate}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, endDate: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {/* Export Buttons */}
            <div className="flex items-end space-x-2">
              <button
                onClick={() => handleExport('pdf')}
                disabled={loading}
                className="btn-secondary flex items-center space-x-2"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={() => handleExport('csv')}
                disabled={loading}
                className="btn-secondary flex items-center space-x-2"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeReport === 'progress' && selectedProject && (
            <ProjectProgressReport projectId={selectedProject} />
          )}
          {activeReport === 'time' && (
            <TimeUtilizationReport filters={{ ...dateRange, projectId: selectedProject }} />
          )}
          {activeReport === 'tasks' && selectedProject && (
            <TaskMetricsReport projectId={selectedProject} dateRange={dateRange} />
          )}
          {!selectedProject && activeReport !== 'time' && (
            <div className="text-center py-12 text-gray-500">
              <DocumentChartBarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select a project to view the report</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
