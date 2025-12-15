import React, { useState, useEffect } from 'react';
import axiosInstance from './utils/axiosInstance';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useAuth } from './AuthProvider';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import SessionExpiryNotice from './components/SessionExpiryNotice';
import './App.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const API_BASE = 'http://localhost:8000/api';

function App() {
  const { isAuthenticated, user, login, logout, getAccessToken, inProgress } = useAuth();
  const [activeTab, setActiveTab] = useState('cloud');
  const [cloudFindings, setCloudFindings] = useState([]);
  const [secretFindings, setSecretFindings] = useState([]);
  const [iacFindings, setIacFindings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [groupedView, setGroupedView] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [repoFilter, setRepoFilter] = useState('all');

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // No need to get token or add auth headers - axios interceptor handles it
      const [cloud, secrets, iac, stats] = await Promise.all([
        axiosInstance.get('/findings/cloud'),
        axiosInstance.get('/findings/secrets'),
        axiosInstance.get('/findings/iac'),
        axiosInstance.get('/stats/summary')
      ]);
      setCloudFindings(cloud.data);
      setSecretFindings(secrets.data);
      setIacFindings(iac.data);
      setSummary(stats.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Error handling is done by axios interceptor
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (endpoint, file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axiosInstance.post(`/upload/${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
      toast.success('File uploaded successfully', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      // Error handling is done by axios interceptor
    }
  };

  const updateFinding = async (type, index, updateData) => {
    try {
      await axiosInstance.put(`/findings/${type}/${index}`, updateData);
      fetchData();
      setEditingIndex(null);
      toast.success('Finding updated successfully', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Error updating finding:', error);
      // Error handling is done by axios interceptor
    }
  };

  const startEditing = (index, currentStatus, currentNotes) => {
    setEditingIndex(index);
    setEditStatus(currentStatus || 'open');
    setEditNotes(currentNotes || '');
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditStatus('');
    setEditNotes('');
  };

  const toggleGroup = (secretId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [secretId]: !prev[secretId]
    }));
  };

  const handleExtendSession = async () => {
    try {
      await getAccessToken(true); // Force token refresh
      toast.success('Session extended successfully', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (error) {
      console.error('Failed to extend session:', error);
      toast.error('Failed to extend session. Please log in again.', {
        position: 'top-right',
        autoClose: 5000,
      });
    }
  };

  const filterFindings = (findings) => {
    return findings.filter(finding => {
      // Search filter
      const matchesSearch = searchTerm === '' ||
        (finding.file_path && finding.file_path.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (finding.secret_type && finding.secret_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (finding.description && finding.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (finding.match && finding.match.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (finding.repo_name && finding.repo_name.toLowerCase().includes(searchTerm.toLowerCase()));

      // Severity filter
      const matchesSeverity = severityFilter === 'all' || finding.severity === severityFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || (finding.status || 'open') === statusFilter;

      // Repo filter
      const matchesRepo = repoFilter === 'all' || finding.repo_name === repoFilter;

      return matchesSearch && matchesSeverity && matchesStatus && matchesRepo;
    });
  };

  const groupSecretsByHash = (findings) => {
    const grouped = {};
    findings.forEach((finding, idx) => {
      const key = finding.rule_id || 'unknown';
      if (!grouped[key]) {
        grouped[key] = {
          secret_type: finding.secret_type || finding.description,
          severity: finding.severity,
          status: finding.status,
          match: finding.match,
          repo_name: finding.repo_name,
          occurrences: finding.occurrences,
          date: finding.date,
          locations: []
        };
      }
      grouped[key].locations.push({
        ...finding,
        originalIndex: idx
      });
    });
    return grouped;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'CRITICAL': '#dc3545',
      'HIGH': '#fd7e14',
      'MEDIUM': '#ffc107',
      'LOW': '#17a2b8',
      'INFO': '#6c757d'
    };
    return colors[severity] || '#6c757d';
  };

  const renderSeverityChart = () => {
    if (!summary) return null;

    const data = {
      labels: ['Critical', 'High', 'Medium', 'Low', 'Info'],
      datasets: [{
        data: [
          summary.severity_breakdown.CRITICAL,
          summary.severity_breakdown.HIGH,
          summary.severity_breakdown.MEDIUM,
          summary.severity_breakdown.LOW,
          summary.severity_breakdown.INFO
        ],
        backgroundColor: [
          '#dc3545',
          '#fd7e14',
          '#ffc107',
          '#17a2b8',
          '#6c757d'
        ]
      }]
    };

    return <Pie data={data} options={{ plugins: { legend: { position: 'bottom' } } }} />;
  };

  const renderStatusBreakdownChart = () => {
    if (!secretFindings.length) return null;

    const statusCounts = secretFindings.reduce((acc, finding) => {
      const status = finding.status || 'open';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const data = {
      labels: Object.keys(statusCounts).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [
          '#ffc107',  // open - yellow
          '#17a2b8',  // mitigated - cyan
          '#28a745'   // closed - green
        ]
      }]
    };

    return <Pie data={data} options={{ plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Secrets by Status' } } }} />;
  };

  const renderRepoComparisonChart = () => {
    if (!secretFindings.length) return null;

    const repoData = secretFindings.reduce((acc, finding) => {
      const repo = finding.repo_name || 'Unknown';
      if (!acc[repo]) {
        acc[repo] = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
      }
      const severity = finding.severity || 'INFO';
      acc[repo][severity] = (acc[repo][severity] || 0) + 1;
      return acc;
    }, {});

    const repos = Object.keys(repoData).slice(0, 5); // Top 5 repos
    const data = {
      labels: repos,
      datasets: [
        {
          label: 'Critical',
          data: repos.map(repo => repoData[repo].CRITICAL),
          backgroundColor: '#dc3545'
        },
        {
          label: 'High',
          data: repos.map(repo => repoData[repo].HIGH),
          backgroundColor: '#fd7e14'
        },
        {
          label: 'Medium',
          data: repos.map(repo => repoData[repo].MEDIUM),
          backgroundColor: '#ffc107'
        },
        {
          label: 'Low',
          data: repos.map(repo => repoData[repo].LOW),
          backgroundColor: '#17a2b8'
        }
      ]
    };

    return <Bar data={data} options={{
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'Secrets by Repository (Top 5)' }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true }
      }
    }} />;
  };

  const renderCloudFindings = () => (
    <div>
      <h2>Cloud Security Findings ({cloudFindings.length})</h2>
      <input
        type="file"
        accept=".json"
        onChange={(e) => uploadFile('checkov', e.target.files[0])}
      />
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Check ID</th>
            <th>Resource</th>
            <th>File</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {cloudFindings.map((finding, idx) => (
            <tr key={idx}>
              <td>
                <span className="severity-badge" style={{backgroundColor: getSeverityColor(finding.severity)}}>
                  {finding.severity}
                </span>
              </td>
              <td>{finding.check_id}</td>
              <td>{finding.resource}</td>
              <td>{finding.file_path}:{finding.line_number}</td>
              <td>{finding.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSecretFindings = () => {
    const filteredFindings = filterFindings(secretFindings);
    const groupedSecrets = groupSecretsByHash(filteredFindings);
    const uniqueCount = Object.keys(groupedSecrets).length;

    // Get unique repo names for filter
    const uniqueRepos = [...new Set(secretFindings.map(f => f.repo_name).filter(Boolean))];

    return (
    <div>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px'}}>
        <h2>Secrets Detected ({filteredFindings.length} of {secretFindings.length} shown, {uniqueCount} unique)</h2>
        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
            <input
              type="checkbox"
              checked={groupedView}
              onChange={(e) => setGroupedView(e.target.checked)}
            />
            Grouped View
          </label>
          <input
            type="file"
            accept=".json"
            onChange={(e) => uploadFile('gitleaks', e.target.files[0])}
          />
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div style={{
        background: '#f8f9fa',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px'
      }}>
        <div>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#495057'}}>
            🔍 Search
          </label>
          <input
            type="text"
            placeholder="Search secrets, files, repos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              fontSize: '14px',
              transition: 'border-color 0.3s'
            }}
          />
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#495057'}}>
            Severity
          </label>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#495057'}}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="mitigated">Mitigated</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: '#495057'}}>
            Repository
          </label>
          <select
            value={repoFilter}
            onChange={(e) => setRepoFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Repositories</option>
            {uniqueRepos.map(repo => (
              <option key={repo} value={repo}>{repo}</option>
            ))}
          </select>
        </div>

        {(searchTerm || severityFilter !== 'all' || statusFilter !== 'all' || repoFilter !== 'all') && (
          <div style={{display: 'flex', alignItems: 'flex-end'}}>
            <button
              onClick={() => {
                setSearchTerm('');
                setSeverityFilter('all');
                setStatusFilter('all');
                setRepoFilter('all');
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                width: '100%'
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Secret Type</th>
            <th>Repository</th>
            <th>File</th>
            <th>Line</th>
            <th>Redacted Secret</th>
            <th>Occurrences</th>
            <th>Status</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groupedView ? (
            // Grouped view - show unique secrets with expand/collapse
            Object.entries(groupedSecrets).map(([secretId, group]) => (
              <React.Fragment key={secretId}>
                <tr
                  onClick={() => toggleGroup(secretId)}
                  style={{
                    backgroundColor: group.status === 'closed' ? '#d4edda' :
                                    group.status === 'mitigated' ? '#d1ecf1' : '#fff3cd',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  <td>
                    <span className="severity-badge" style={{backgroundColor: getSeverityColor(group.severity)}}>
                      {group.severity}
                    </span>
                  </td>
                  <td>
                    <span style={{marginRight: '8px'}}>{expandedGroups[secretId] ? '▼' : '▶'}</span>
                    {group.secret_type}
                  </td>
                  <td>{group.repo_name || '-'}</td>
                  <td colSpan="2" style={{fontSize: '0.9em', color: '#666'}}>
                    {group.locations.length} location(s) - Click to expand
                  </td>
                  <td><code>{group.match}</code></td>
                  <td>{group.occurrences ? `${group.occurrences}x` : '-'}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85em',
                      backgroundColor: group.status === 'open' ? '#ffc107' :
                                     group.status === 'closed' ? '#28a745' :
                                     group.status === 'mitigated' ? '#17a2b8' : '#6c757d',
                      color: 'white'
                    }}>
                      {group.status || 'open'}
                    </span>
                  </td>
                  <td style={{fontSize: '0.85em'}}>{group.date || '-'}</td>
                  <td>-</td>
                </tr>
                {expandedGroups[secretId] && group.locations.map((finding) => (
                  <React.Fragment key={finding.originalIndex}>
                    <tr style={{
                      backgroundColor: '#f8f9fa',
                      borderLeft: '4px solid #007bff'
                    }}>
                      <td></td>
                      <td style={{fontSize: '0.85em', paddingLeft: '30px'}}>↳ Instance</td>
                      <td>{finding.repo_name || '-'}</td>
                      <td style={{fontSize: '0.85em', wordBreak: 'break-all', maxWidth: '300px'}}>
                        {finding.file_path}
                      </td>
                      <td>{finding.line_number}</td>
                      <td><code>{finding.match}</code></td>
                      <td>-</td>
                      <td>
                        {editingIndex === finding.originalIndex ? (
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            style={{padding: '4px'}}
                          >
                            <option value="open">Open</option>
                            <option value="mitigated">Mitigated</option>
                            <option value="closed">Closed</option>
                          </select>
                        ) : (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.85em',
                            backgroundColor: finding.status === 'open' ? '#ffc107' :
                                           finding.status === 'closed' ? '#28a745' :
                                           finding.status === 'mitigated' ? '#17a2b8' : '#6c757d',
                            color: 'white'
                          }}>
                            {finding.status || 'open'}
                          </span>
                        )}
                      </td>
                      <td style={{fontSize: '0.85em'}}>{finding.date || '-'}</td>
                      <td>
                        {editingIndex === finding.originalIndex ? (
                          <div style={{display: 'flex', gap: '5px'}}>
                            <button
                              onClick={() => updateFinding('secrets', finding.originalIndex, {status: editStatus, notes: editNotes})}
                              style={{padding: '4px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditing}
                              style={{padding: '4px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(finding.originalIndex, finding.status, finding.notes)}
                            style={{padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                    {editingIndex === finding.originalIndex && (
                      <tr style={{backgroundColor: '#f8f9fa'}}>
                        <td colSpan="10" style={{padding: '10px', paddingLeft: '50px'}}>
                          <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                            Notes:
                          </label>
                          <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            style={{width: '100%', minHeight: '60px', padding: '8px'}}
                            placeholder="Add notes about remediation, mitigation steps, etc..."
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))
          ) : (
            // Flat view - show all findings individually
            filteredFindings.map((finding, idx) => (
            <React.Fragment key={idx}>
              <tr style={{
                backgroundColor: finding.status === 'closed' ? '#d4edda' :
                                finding.status === 'mitigated' ? '#d1ecf1' : '#fff3cd'
              }}>
                <td>
                  <span className="severity-badge" style={{backgroundColor: getSeverityColor(finding.severity)}}>
                    {finding.severity}
                  </span>
                </td>
                <td>{finding.secret_type || finding.description}</td>
                <td>{finding.repo_name || '-'}</td>
                <td style={{fontSize: '0.85em', wordBreak: 'break-all', maxWidth: '300px'}}>
                  {finding.file_path}
                </td>
                <td>{finding.line_number}</td>
                <td><code>{finding.match}</code></td>
                <td>{finding.occurrences ? `${finding.occurrences}x` : '-'}</td>
                <td>
                  {editingIndex === idx ? (
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      style={{padding: '4px'}}
                    >
                      <option value="open">Open</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="closed">Closed</option>
                    </select>
                  ) : (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.85em',
                      backgroundColor: finding.status === 'open' ? '#ffc107' :
                                     finding.status === 'closed' ? '#28a745' :
                                     finding.status === 'mitigated' ? '#17a2b8' : '#6c757d',
                      color: 'white'
                    }}>
                      {finding.status || 'open'}
                    </span>
                  )}
                </td>
                <td style={{fontSize: '0.85em'}}>{finding.date || '-'}</td>
                <td>
                  {editingIndex === idx ? (
                    <div style={{display: 'flex', gap: '5px'}}>
                      <button
                        onClick={() => updateFinding('secrets', idx, {status: editStatus, notes: editNotes})}
                        style={{padding: '4px 8px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        style={{padding: '4px 8px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditing(idx, finding.status, finding.notes)}
                      style={{padding: '4px 8px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
              {editingIndex === idx && (
                <tr style={{backgroundColor: '#f8f9fa'}}>
                  <td colSpan="10" style={{padding: '10px'}}>
                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                      Notes:
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      style={{width: '100%', minHeight: '60px', padding: '8px'}}
                      placeholder="Add notes about remediation, mitigation steps, etc..."
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))
          )}
        </tbody>
      </table>
    </div>
    );
  };

  const renderIaCFindings = () => (
    <div>
      <h2>IaC Security Findings ({iacFindings.length})</h2>
      <input
        type="file"
        accept=".json"
        onChange={(e) => uploadFile('trivy', e.target.files[0])}
      />
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Check ID</th>
            <th>Resource Type</th>
            <th>File</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {iacFindings.map((finding, idx) => (
            <tr key={idx}>
              <td>
                <span className="severity-badge" style={{backgroundColor: getSeverityColor(finding.severity)}}>
                  {finding.severity}
                </span>
              </td>
              <td>{finding.check_id}</td>
              <td>{finding.resource_type}</td>
              <td>{finding.file_path}</td>
              <td>{finding.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="App">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px'
        }}>
          <h1 style={{marginBottom: '20px'}}>🔒 DevSecOps Security Dashboard</h1>
          <p style={{marginBottom: '30px', color: '#666'}}>
            Please sign in with your Azure AD account to access the dashboard
          </p>
          <button
            onClick={login}
            disabled={inProgress}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#0078d4',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: inProgress ? 'not-allowed' : 'pointer',
              opacity: inProgress ? 0.6 : 1
            }}
          >
            {inProgress ? 'Signing in...' : 'Sign in with Microsoft'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <ToastContainer />
      <SessionExpiryNotice onExtendSession={handleExtendSession} />

      <header>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
          <h1>🔒 DevSecOps Security Dashboard</h1>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            {user && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '10px 16px',
                borderRadius: '8px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              }}>
                <span style={{color: 'white', fontSize: '14px', fontWeight: '500'}}>
                  👤 <strong>{user.name || user.username || user.email}</strong>
                </span>
              </div>
            )}
            <button
              onClick={logout}
              style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(220, 53, 69, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
        {summary && (
          <div className="summary">
            <div className="stat-card">
              <h3>{summary.total_cloud_findings}</h3>
              <p>Cloud Findings</p>
            </div>
            <div className="stat-card">
              <h3>{summary.total_secrets}</h3>
              <p>Secrets</p>
            </div>
            <div className="stat-card">
              <h3>{summary.total_iac_findings}</h3>
              <p>IaC Findings</p>
            </div>
          </div>
        )}
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'cloud' ? 'active' : ''}
          onClick={() => setActiveTab('cloud')}
        >
          Cloud Security
        </button>
        <button
          className={activeTab === 'secrets' ? 'active' : ''}
          onClick={() => setActiveTab('secrets')}
        >
          Secrets
        </button>
        <button
          className={activeTab === 'iac' ? 'active' : ''}
          onClick={() => setActiveTab('iac')}
        >
          IaC Findings
        </button>
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
      </nav>

      <main>
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '300px',
            gap: '20px'
          }}>
            <div className="loading-spinner" style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(102, 126, 234, 0.3)',
              borderTop: '4px solid #667eea'
            }}></div>
            <p style={{color: '#6c757d', fontSize: '16px', fontWeight: '500'}}>Loading security findings...</p>
          </div>
        ) : (
          <>
            {activeTab === 'cloud' && renderCloudFindings()}
            {activeTab === 'secrets' && renderSecretFindings()}
            {activeTab === 'iac' && renderIaCFindings()}
            {activeTab === 'overview' && (
              <div className="overview">
                <h2>Security Posture Overview</h2>

                {/* Additional Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                  marginBottom: '40px'
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '24px',
                    borderRadius: '12px',
                    color: 'white',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
                  }}>
                    <h3 style={{margin: '0', fontSize: '3em', fontWeight: '700'}}>
                      {summary ? summary.severity_breakdown.CRITICAL + summary.severity_breakdown.HIGH : 0}
                    </h3>
                    <p style={{margin: '10px 0 0 0', fontSize: '0.95em', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                      Critical + High
                    </p>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    padding: '24px',
                    borderRadius: '12px',
                    color: 'white',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px rgba(245, 87, 108, 0.3)'
                  }}>
                    <h3 style={{margin: '0', fontSize: '3em', fontWeight: '700'}}>
                      {secretFindings.filter(f => !f.status || f.status === 'open').length}
                    </h3>
                    <p style={{margin: '10px 0 0 0', fontSize: '0.95em', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                      Open Secrets
                    </p>
                  </div>

                  <div style={{
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    padding: '24px',
                    borderRadius: '12px',
                    color: 'white',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px rgba(79, 172, 254, 0.3)'
                  }}>
                    <h3 style={{margin: '0', fontSize: '3em', fontWeight: '700'}}>
                      {[...new Set(secretFindings.map(f => f.repo_name).filter(Boolean))].length}
                    </h3>
                    <p style={{margin: '10px 0 0 0', fontSize: '0.95em', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                      Repositories
                    </p>
                  </div>
                </div>

                {/* Charts Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                  gap: '30px',
                  marginTop: '30px'
                }}>
                  <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
                  }}>
                    <h3 style={{marginTop: '0', marginBottom: '20px', color: '#2d3748'}}>Findings by Severity</h3>
                    <div style={{maxHeight: '350px'}}>
                      {renderSeverityChart()}
                    </div>
                  </div>

                  {secretFindings.length > 0 && (
                    <div style={{
                      background: 'white',
                      padding: '24px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
                    }}>
                      <h3 style={{marginTop: '0', marginBottom: '20px', color: '#2d3748'}}>Secrets by Status</h3>
                      <div style={{maxHeight: '350px'}}>
                        {renderStatusBreakdownChart()}
                      </div>
                    </div>
                  )}

                  {secretFindings.length > 0 && (
                    <div style={{
                      background: 'white',
                      padding: '24px',
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      gridColumn: 'span 2'
                    }}>
                      <h3 style={{marginTop: '0', marginBottom: '20px', color: '#2d3748'}}>Secrets by Repository</h3>
                      <div style={{maxHeight: '400px'}}>
                        {renderRepoComparisonChart()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
