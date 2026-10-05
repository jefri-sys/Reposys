import React, { useState, useEffect, useContext } from 'react';
import { Plus, Trash2, Printer, CheckCircle2, XCircle, Zap, Server, Clock, Settings2, Loader2, Activity, PlayCircle, StopCircle, AlertTriangle, Download, Info } from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { AuthContext } from '../../context/AuthContextObject';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Badge, LoadingState } from '../ui';

const PrinterManagement = () => {
  const { socket } = useSocket();
  const { user } = useContext(AuthContext);
  const [printers, setPrinters] = useState([]);
  const [pendingPrinters, setPendingPrinters] = useState([]);
  const [spaeConfig, setSpaeConfig] = useState(null);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [discoveredPrinters, setDiscoveredPrinters] = useState([]);
  const [agentInfo, setAgentInfo] = useState(null);
  const [registeredAgents, setRegisteredAgents] = useState([]);
  const [agentCredentials, setAgentCredentials] = useState(null);
  const [pingStatus, setPingStatus] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeletingAgent, setIsDeletingAgent] = useState(false);
  const [printerDeleteConfirm, setPrinterDeleteConfirm] = useState(null); // { _id, name }
  const [isDeletingPrinter, setIsDeletingPrinter] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showSpaeModal, setShowSpaeModal] = useState(false);
  const [isSpaeToggling, setIsSpaeToggling] = useState(false);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(null);

  const INITIAL_CONFIG_FORM = {
    displayName: '',
    location: '',
    department: '',
    priority: 5,
    capabilities: {
      supportsColor: false,
      supportsDuplex: false,
      paperSizes: ['A4'],
      maxQueueSize: 10,
    },
    isDefault: false,
  };
  const [configForm, setConfigForm] = useState(INITIAL_CONFIG_FORM);

  const INITIAL_FORM = {
    printerId: '',
    friendlyName: '',
    agentId: '',
    windowsPrinterName: '',
    capabilities: {
      supportsColor: false,
      supportsDuplex: false,
      paperSizes: ['A4'],
    },
    isDefault: false,
  };
  const [form, setForm] = useState(INITIAL_FORM);

  const fetchSpaeStatus = async () => {
    try {
      const response = await api.get('/automation/status');
      setSpaeConfig(response.data);
    } catch (err) {
      console.warn('Failed to fetch SPAE status', err);
    }
  };

  const loadAgents = async () => {
    try {
      const res = await api.get('/printers/print-agents/connected');
      setAgents(res.data.agents || []);
    } catch (err) {
      console.error('Failed to load agents:', err);
    }
    
    // Also load full registered agents for the table
    if (user?.role === 'Admin') {
      try {
        const regRes = await api.get('/admin/print-agent/agents');
        setRegisteredAgents(regRes.data.agents || []);
      } catch (err) {
        console.error('Failed to load registered agents:', err);
      }
    }
  };

  const loadPrinters = async () => {
    try {
      const res = await api.get('/printers');
      setPrinters(res.data.printers || []);
    } catch (err) {
      console.error('Failed to load printers:', err);
    }
  };

  const loadPendingPrinters = async () => {
    try {
      const res = await api.get('/printers/pending');
      setPendingPrinters(res.data.printers || []);
    } catch (err) {
      console.error('Failed to load pending printers:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([loadAgents(), loadPrinters(), loadPendingPrinters(), fetchSpaeStatus()]);
      setIsLoading(false);
    };
    init();

    // Fetch print agent info (non-blocking, doesn't affect main loading state)
    api.get('/admin/print-agent/info')
      .then(res => setAgentInfo(res.data))
      .catch(() => setAgentInfo({ available: false, version: 'Unknown', notes: '' }));

    if (user?.role === 'Admin') {
      api.get('/admin/print-agent/credentials')
        .then(res => setAgentCredentials(res.data))
        .catch(() => setAgentCredentials(null));
    }

    const interval = setInterval(() => {
      loadAgents();
      loadPrinters();
      loadPendingPrinters();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onStatusUpdate = () => {
      console.log('Printer status updated via socket');
      loadAgents();
      loadPrinters();
    };

    socket.on('printer_status_updated', onStatusUpdate);
    socket.on('agent_registered', loadAgents);

    const handlePrintersUpdated = () => {
      loadPrinters();
      loadPendingPrinters();
    };
    socket.on('printers_updated', handlePrintersUpdated);

    return () => {
      socket.off('printer_status_updated', onStatusUpdate);
      socket.off('printers_updated', handlePrintersUpdated);
    };
  }, [socket]);

  const handleToggleSpae = async () => {
    setIsSpaeToggling(true);
    const wasEnabled = spaeConfig?.spae?.enabled;
    try {
      await api.patch('/config/spae/toggle');
      await fetchSpaeStatus();
      setMessage(`SPAE Engine ${wasEnabled ? 'Disabled' : 'Enabled'}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle SPAE.');
      setTimeout(() => setError(''), 3000);
      await fetchSpaeStatus();
    } finally {
      setIsSpaeToggling(false);
      setShowSpaeModal(false);
    }
  };

  const handleAgentSelect = (agentId) => {
    setSelectedAgentId(agentId);
    setForm(prev => ({ ...prev, agentId, windowsPrinterName: '' }));
    const agent = agents.find(a => a.agentId === agentId);
    setDiscoveredPrinters(agent?.discoveredPrinters || []);
  };

  const handleConfigure = async (e) => {
    e.preventDefault();
    if (!configForm.displayName.trim()) {
      setError('Display Name is required.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    if (configForm.capabilities.paperSizes.length === 0) {
      setError('Select at least one paper size.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setIsSubmitting(true);
    try {
      await api.patch(`/printers/${selectedPrinter._id}/configure`, configForm);
      setSelectedPrinter(null);
      setShowConfigModal(false);
      loadPrinters();
      loadPendingPrinters();
      setMessage('Printer configured successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Configuration failed.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/printers', form);
      setForm(INITIAL_FORM);
      setSelectedAgentId('');
      setDiscoveredPrinters([]);
      setShowAddForm(false);
      setMessage('Printer added successfully.');
      setTimeout(() => setMessage(''), 3000);
      await loadPrinters();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add printer.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open confirm modal — no API call yet
  const handleDelete = (printerId) => {
    const printer = printers.find(p => p.printerId === printerId);
    if (!printer) return;
    setPrinterDeleteConfirm({ _id: printer._id, name: printer.displayName || printer.friendlyName || printer.windowsPrinterName });
  };

  // Confirmed: permanently delete from DB
  const confirmDeletePrinter = async () => {
    if (!printerDeleteConfirm) return;
    setIsDeletingPrinter(true);
    try {
      await api.delete(`/printers/${printerDeleteConfirm._id}`);
      setPrinterDeleteConfirm(null);
      setMessage('Printer permanently deleted. You can add it again anytime.');
      setTimeout(() => setMessage(''), 4000);
      await loadPrinters();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete printer.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsDeletingPrinter(false);
    }
  };

  const handlePaperSizeChange = (size, checked) => {
    setForm(prev => {
      let sizes = [...prev.capabilities.paperSizes];
      if (checked && !sizes.includes(size)) sizes.push(size);
      if (!checked) sizes = sizes.filter(s => s !== size);
      return { ...prev, capabilities: { ...prev.capabilities, paperSizes: sizes } };
    });
  };

  const handlePingAgent = async (agentId) => {
    setPingStatus(prev => ({ ...prev, [agentId]: { loading: true } }));
    try {
      const res = await api.post(`/admin/print-agent/agents/${agentId}/ping`);
      if (res.data.responsive) {
        setPingStatus(prev => ({ ...prev, [agentId]: { loading: false, result: `Responsive (${res.data.latencyMs}ms)`, success: true } }));
      } else {
        setPingStatus(prev => ({ ...prev, [agentId]: { loading: false, result: res.data.error || 'No response', success: false } }));
      }
    } catch (error) {
      setPingStatus(prev => ({ ...prev, [agentId]: { loading: false, result: error.response?.data?.error || 'Failed', success: false } }));
    }
  };

  const handleDeregisterAgent = async (agentId) => {
    if (!window.confirm(`Deregister Agent ${agentId}?\n\nThis will disconnect it immediately. The agent record will be kept for history.\nThe workstation will need to go through Setup again to reconnect.`)) {
      return;
    }
    try {
      await api.delete(`/admin/print-agent/agents/${agentId}`);
      setMessage(`Agent ${agentId} deregistered. Record kept for history.`);
      setTimeout(() => setMessage(''), 4000);
      loadAgents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to deregister agent.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    setIsDeletingAgent(true);
    try {
      await api.delete(`/admin/print-agent/agents/${agentId}/hard-delete`);
      setMessage(`Agent ${agentId} permanently deleted.`);
      setTimeout(() => setMessage(''), 4000);
      setDeleteConfirm(null);
      loadAgents();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete agent.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsDeletingAgent(false);
    }
  };

  const connectedAgentsCount = agents.length;
  const onlinePrintersCount = printers.filter(p => p.isOnline).length;
  const activeJobsCount = spaeConfig?.activeJobs || 0;
  const queueCapacity = spaeConfig?.spae?.maxQueueSize || 50;

  return (
    <div className="space-y-6 relative">
      {/* SPAE Toggle Modal Overlay */}
      {showSpaeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className={`flex shrink-0 h-12 w-12 items-center justify-center rounded-full ${spaeConfig?.spae?.enabled ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {spaeConfig?.spae?.enabled ? <StopCircle className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900">
                  {spaeConfig?.spae?.enabled ? 'Disable SPAE Automation?' : 'Enable SPAE Automation?'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {spaeConfig?.spae?.enabled
                    ? "Turning off SPAE will stop automatic print dispatch. Orders will still be accepted, but counter staff must manually print documents until SPAE is enabled again."
                    : "Automatic workflow orchestration will resume. New print jobs will be dispatched automatically to available Print Agents."}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSpaeModal(false)} disabled={isSpaeToggling}>
                Cancel
              </Button>
              <Button
                variant={spaeConfig?.spae?.enabled ? 'danger' : 'primary'}
                onClick={handleToggleSpae}
                disabled={isSpaeToggling}
              >
                {isSpaeToggling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {spaeConfig?.spae?.enabled ? 'Disable SPAE' : 'Enable SPAE'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[28px] shadow-xl max-w-2xl w-full p-6 animate-in zoom-in-95 duration-200 my-8 border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-900">Configure Printer</h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleConfigure} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Display Name *"
                  required
                  value={configForm.displayName}
                  onChange={e => setConfigForm({ ...configForm, displayName: e.target.value })}
                  placeholder="e.g. Front Desk Colour Printer"
                />
                <Input
                  label="Location"
                  value={configForm.location}
                  onChange={e => setConfigForm({ ...configForm, location: e.target.value })}
                  placeholder="e.g. Reprography Counter A"
                />
                <Input
                  label="Department"
                  value={configForm.department}
                  onChange={e => setConfigForm({ ...configForm, department: e.target.value })}
                  placeholder="e.g. General Use"
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Priority (1-10)</label>
                  <input
                    type="number"
                    min="1" max="10"
                    required
                    value={configForm.priority}
                    onChange={e => setConfigForm({ ...configForm, priority: parseInt(e.target.value) })}
                    className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">Higher priority printers are preferred during routing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="space-y-3">
                  <span className="text-sm font-semibold text-slate-700 block border-b border-slate-200 pb-2">Paper Sizes</span>
                  <div className="flex flex-col gap-2">
                    {['A4', 'A3', 'A5', 'Letter'].map(size => (
                      <label key={size} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={configForm.capabilities.paperSizes.includes(size)}
                          onChange={e => {
                            let sizes = [...configForm.capabilities.paperSizes];
                            if (e.target.checked && !sizes.includes(size)) sizes.push(size);
                            if (!e.target.checked) sizes = sizes.filter(s => s !== size);
                            setConfigForm({ ...configForm, capabilities: { ...configForm.capabilities, paperSizes: sizes } });
                          }}
                          className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        {size}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-sm font-semibold text-slate-700 block border-b border-slate-200 pb-2">Features & Limits</span>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configForm.capabilities.supportsColor}
                        onChange={e => setConfigForm({ ...configForm, capabilities: { ...configForm.capabilities, supportsColor: e.target.checked } })}
                        className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      Color Support
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={configForm.capabilities.supportsDuplex}
                        onChange={e => setConfigForm({ ...configForm, capabilities: { ...configForm.capabilities, supportsDuplex: e.target.checked } })}
                        className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      Duplex Support
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-2 pt-2 border-t border-slate-200">
                      <input
                        type="checkbox"
                        checked={configForm.isDefault}
                        onChange={e => setConfigForm({ ...configForm, isDefault: e.target.checked })}
                        className="rounded border-slate-300 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      Set as Default Printer
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 w-1/2">
                <label className="text-sm font-medium text-slate-700">Max Queue Size</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={configForm.capabilities.maxQueueSize}
                  onChange={e => setConfigForm({ ...configForm, capabilities: { ...configForm.capabilities, maxQueueSize: parseInt(e.target.value) || 10 } })}
                  className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500">Maximum concurrent jobs before SPAE routes to next printer</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setShowConfigModal(false)}>Cancel</Button>
                <Button type="submit" isLoading={isSubmitting}>Save Configuration</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SPAE Status Card */}
      <Card className="border-slate-200 shadow-sm overflow-hidden relative bg-white">
        {isSpaeToggling && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Main Control Area */}
            <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-sm shrink-0">
                  <Zap className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Smart Print Automation Engine (SPAE)</h2>

                  <div className="mt-4 flex items-center gap-3">
                    {spaeConfig?.spae?.enabled ? (
                      <Badge variant="success" className="px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-2 animate-pulse" />
                        Running
                      </Badge>
                    ) : (
                      <Badge variant="danger" className="px-2.5 py-0.5 rounded-full border border-red-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 mr-2" />
                        Stopped
                      </Badge>
                    )}
                    <span className="text-sm font-medium text-slate-600">
                      {spaeConfig?.spae?.enabled
                        ? 'Automatic print dispatch is enabled.'
                        : 'Staff will manually print all documents.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Toggle Switch Area */}
            <div className="md:w-72 bg-slate-50/50 border-t md:border-t-0 md:border-l border-slate-100 p-6 md:p-8 flex items-center justify-center shrink-0">
              <button
                type="button"
                onClick={() => setShowSpaeModal(true)}
                disabled={isSpaeToggling || !spaeConfig}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${spaeConfig?.spae?.enabled ? 'bg-blue-600' : 'bg-slate-300'
                  } ${(!spaeConfig || isSpaeToggling) ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={spaeConfig?.spae?.enabled}
              >
                <span className="sr-only">Toggle SPAE</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center ${spaeConfig?.spae?.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                >
                  {isSpaeToggling ? (
                    <Loader2 className={`h-4 w-4 animate-spin ${spaeConfig?.spae?.enabled ? 'text-blue-600' : 'text-slate-400'}`} />
                  ) : (
                    spaeConfig?.spae?.enabled ? <CheckCircle2 className="h-4 w-4 text-blue-600" /> : <XCircle className="h-4 w-4 text-slate-400" />
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Service Summary Section */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-4 px-6 md:px-8 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Connected Agents</p>
                <p className="text-sm font-semibold text-slate-900">{connectedAgentsCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500">
                <Printer className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Online Printers</p>
                <p className="text-sm font-semibold text-slate-900">{onlinePrintersCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Jobs</p>
                <p className="text-sm font-semibold text-slate-900">{activeJobsCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Queue Capacity</p>
                <p className="text-sm font-semibold text-slate-900">{activeJobsCount} / {queueCapacity}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 col-span-2 md:col-span-1">
              <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Last Event</p>
                <p className="text-sm font-semibold text-slate-900 truncate max-w-[120px]" title={spaeConfig?.lastLog?.event || 'No events'}>
                  {spaeConfig?.lastLog?.event || 'No events'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registered Agents Table */}
      {user?.role === 'Admin' && registeredAgents.length > 0 && (
        <Card>
          <CardHeader className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 shrink-0">
                <Server className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Status & Verification</p>
                <CardTitle>Registered Print Agents</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-slate-700">Agent ID</th>
                  <th className="px-6 py-3 font-semibold text-slate-700">Machine / OS</th>
                  <th className="px-6 py-3 font-semibold text-slate-700">Status</th>
                  <th className="px-6 py-3 font-semibold text-slate-700">Printers</th>
                  <th className="px-6 py-3 font-semibold text-slate-700">Last Seen</th>
                  <th className="px-6 py-3 font-semibold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registeredAgents.map((agent) => {
                  const lastSeenTime = agent.lastSeenAt ? new Date(agent.lastSeenAt).getTime() : 0;
                  const isRecentlySeen = (Date.now() - lastSeenTime) < 120000;
                  const isDeregistered = agent.isDeregistered === true;
                  const status = isDeregistered ? 'Deregistered' : (agent.isAgentConnected || isRecentlySeen ? 'Online' : (agent.lastSeenAt ? 'Offline' : 'Unknown'));
                  const canDelete = status === 'Offline' || status === 'Deregistered' || status === 'Unknown';

                  return (
                    <tr key={agent._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-medium text-slate-900">{agent.agentId}</div>
                        {agent.agentVersion && <div className="text-xs text-slate-500 mt-0.5">v{agent.agentVersion}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-700">{agent.machineName || 'Unknown Host'}</div>
                        <div className="text-xs text-slate-500 mt-0.5 max-w-[150px] truncate">{agent.windowsVersion || 'Unknown OS'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {status === 'Online' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        )}
                        {status === 'Offline' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Offline
                          </span>
                        )}
                        {status === 'Deregistered' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Deregistered
                          </span>
                        )}
                        {status === 'Unknown' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                            Unknown
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {agent.printerCount} <span className="text-slate-400 font-normal">detected</span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {agent.lastSeenAt ? new Date(agent.lastSeenAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {pingStatus[agent.agentId]?.result && (
                            <span className={`text-xs mr-2 ${pingStatus[agent.agentId].success ? 'text-emerald-600' : 'text-red-600'}`}>
                              {pingStatus[agent.agentId].result}
                            </span>
                          )}
                          <button
                            type="button"
                            title={status === 'Deregistered' ? 'Agent is deregistered' : 'Ping agent'}
                            className="px-3 py-1 text-sm bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={pingStatus[agent.agentId]?.loading || isDeregistered}
                            onClick={(e) => { e.preventDefault(); handlePingAgent(agent.agentId); }}
                          >
                            {pingStatus[agent.agentId]?.loading ? '...' : 'Ping'}
                          </button>
                          <button
                            type="button"
                            title={isDeregistered ? 'Already deregistered' : 'Deregister agent'}
                            className="px-3 py-1 text-sm bg-white border border-amber-300 rounded text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={isDeregistered}
                            onClick={(e) => { e.preventDefault(); handleDeregisterAgent(agent.agentId); }}
                          >
                            Deregister
                          </button>
                          <button
                            type="button"
                            title={!canDelete ? 'Deregister the agent first before deleting' : 'Permanently delete this agent record'}
                            className="px-3 py-1 text-sm bg-white border border-red-300 rounded text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            disabled={!canDelete}
                            onClick={(e) => { e.preventDefault(); setDeleteConfirm(agent); }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Hardware Config</p>
              <CardTitle>Printer Management</CardTitle>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" icon={Plus} onClick={() => setShowAddForm(!showAddForm)}>
              Add Printer
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}
          {message && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200">{message}</div>}

          {showAddForm && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <h4 className="font-semibold text-slate-800 text-sm">Add New Printer</h4>
              <form onSubmit={handleSave} className="space-y-4">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Printer ID (e.g. PRINTER_01)"
                    required
                    value={form.printerId}
                    onChange={e => setForm({ ...form, printerId: e.target.value })}
                    placeholder="PRINTER_01"
                  />
                  <Input
                    label="Friendly Name (e.g. Front Desk)"
                    required
                    value={form.friendlyName}
                    onChange={e => setForm({ ...form, friendlyName: e.target.value })}
                    placeholder="Front Desk Printer"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Print Agent</label>
                    <select
                      className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                      value={selectedAgentId}
                      onChange={e => handleAgentSelect(e.target.value)}
                    >
                      <option value="" disabled>Select an Agent</option>
                      {agents.map(agent => (
                        <option key={agent.agentId} value={agent.agentId}>
                          {agent.agentId} — {agent.isCurrentlyConnected ? 'Online' : 'Offline (last known)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Windows Printer Name</label>
                    <select
                      className="w-full h-10 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
                      required
                      disabled={!selectedAgentId}
                      value={form.windowsPrinterName}
                      onChange={e => setForm({ ...form, windowsPrinterName: e.target.value })}
                    >
                      <option value="" disabled>
                        {!selectedAgentId ? 'Select an agent first' : 'Select Printer'}
                      </option>
                      {discoveredPrinters.map(p => (
                        <option key={p.windowsPrinterName} value={p.windowsPrinterName}>
                          {p.windowsPrinterName} {p.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                    {selectedAgentId && discoveredPrinters.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">No printers found from this agent. Connect the Print Agent first.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.capabilities.supportsColor} onChange={e => setForm({ ...form, capabilities: { ...form.capabilities, supportsColor: e.target.checked } })} className="rounded border-slate-300" />
                    Color Support
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.capabilities.supportsDuplex} onChange={e => setForm({ ...form, capabilities: { ...form.capabilities, supportsDuplex: e.target.checked } })} className="rounded border-slate-300" />
                    Duplex Support
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={form.isDefault} onChange={e => setForm({ ...form, isDefault: e.target.checked })} className="rounded border-slate-300" />
                    Set as Default
                  </label>
                </div>

                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-100">
                  <span className="text-sm text-slate-700 font-medium pt-1">Paper Sizes:</span>
                  {['A4', 'A3', 'Letter'].map(size => (
                    <label key={size} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.capabilities.paperSizes.includes(size)}
                        onChange={e => handlePaperSizeChange(size, e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      {size}
                    </label>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  <Button type="submit" isLoading={isSubmitting}>Save Printer</Button>
                </div>
              </form>
            </div>
          )}

          {pendingPrinters.length > 0 && (
            <div className="space-y-4 mb-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                Pending Configuration — {pendingPrinters.length} printer(s) require setup
              </p>
              <div className="grid gap-3">
                {pendingPrinters.map(printer => (
                  <div key={printer._id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-xl">{printer.windowsPrinterName}</h4>
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Agent: {printer.agentId}</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-wider bg-amber-100 text-amber-700 border-amber-200">
                          Pending Configuration
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">This printer was auto-discovered. Configure capabilities before SPAE can use it.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedPrinter(printer);
                        setConfigForm({
                          displayName: printer.displayName || printer.windowsPrinterName,
                          location: printer.location || '',
                          department: printer.department || '',
                          priority: printer.priority || 5,
                          capabilities: {
                            supportsColor: printer.capabilities?.supportsColor || false,
                            supportsDuplex: printer.capabilities?.supportsDuplex || false,
                            paperSizes: printer.capabilities?.paperSizes?.length > 0 ? printer.capabilities.paperSizes : ['A4'],
                            maxQueueSize: printer.capabilities?.maxQueueSize || 10,
                          },
                          isDefault: printer.isDefault || false,
                        });
                        setShowConfigModal(true);
                      }}>
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-8"><LoadingState message="Loading printers..." /></div>
          ) : printers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No printers configured.</p>
          ) : (
            <div className="grid gap-3">
              {printers.map(printer => {
                const agent = agents.find(a => a.agentId === printer.agentId);
                const agentLastHeartbeat = agent?.lastHeartbeat ? new Date(agent.lastHeartbeat).getTime() : 0;
                const agentConnected = agent ? (agent.isCurrentlyConnected || (Date.now() - agentLastHeartbeat < 120000)) : false;

                const getComputedStatus = () => {
                  if (!agentConnected || printer.workOffline || printer.printerStatus === 'Offline' || !printer.isOnline) return 'Offline';
                  const errorStatuses = ['Error', 'PaperJam', 'DoorOpen', 'DriverError', 'NotAvailable'];
                  const warningStatuses = ['TonerLow', 'OutOfPaper', 'LowPaper'];
                  if (errorStatuses.includes(printer.printerStatus)) return 'Error';
                  if (warningStatuses.includes(printer.printerStatus)) return 'Warning';
                  if (printer.currentStatus === 'Printing' || printer.printerStatus === 'Printing') return 'Printing';
                  return 'Idle';
                };

                const status = getComputedStatus();
                const badgeProps = {
                  'Idle': { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
                  'Printing': { color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
                  'Warning': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', label: 'Toner Low' },
                  'Error': { color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
                  'Offline': { color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' }
                }[status];

                return (
                  <div key={printer._id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-900">{printer.displayName || printer.friendlyName}</h4>
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{printer.printerId}</span>
                        {printer.isDefault && <Badge variant="primary" className="text-[10px]">Default</Badge>}
                        <span className="flex items-center gap-1.5 text-xs font-medium bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                          <span className={`w-2 h-2 rounded-full ${printer.isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          Agent: {printer.agentId}
                        </span>
                        {printer.isConfigured && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-wider bg-emerald-100 text-emerald-700 border-emerald-200">
                            Configured
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-wider ${badgeProps.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badgeProps.dot}`} />
                          {badgeProps.label || status}
                        </span>
                        <span className="text-xs text-slate-500 px-2 py-0.5">WinName: {printer.windowsPrinterName}</span>

                        {printer.capabilities?.paperSizes?.map(size => (
                          <span key={size} className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">{size}</span>
                        ))}
                        {printer.capabilities?.supportsColor && <span className="bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold">Color</span>}
                        {printer.capabilities?.supportsDuplex && <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[10px] font-bold">Duplex</span>}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {printer.paperLevel !== 'Unknown' && (
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Paper: {printer.paperLevel}</span>
                        )}
                        {printer.tonerLevel !== 'Unknown' && (
                          <span className="bg-slate-50 px-2 py-0.5 rounded border border-slate-100">Toner: {printer.tonerLevel}</span>
                        )}
                        <span>Last heartbeat: {printer.lastHeartbeat ? new Date(printer.lastHeartbeat).toLocaleTimeString() : 'Never'}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => {
                        setSelectedPrinter(printer);
                        setConfigForm({
                          displayName: printer.displayName || printer.friendlyName || printer.windowsPrinterName,
                          location: printer.location || '',
                          department: printer.department || '',
                          priority: printer.priority || 5,
                          capabilities: {
                            supportsColor: printer.capabilities?.supportsColor || false,
                            supportsDuplex: printer.capabilities?.supportsDuplex || false,
                            paperSizes: printer.capabilities?.paperSizes?.length > 0 ? printer.capabilities.paperSizes : ['A4'],
                            maxQueueSize: printer.capabilities?.maxQueueSize || 10,
                          },
                          isDefault: printer.isDefault || false,
                        });
                        setShowConfigModal(true);
                      }}>
                        Edit
                      </Button>
                      <Button size="sm" variant="dangerOutline" icon={Trash2} onClick={() => handleDelete(printer.printerId)}>
                        Deactivate
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Agent Download Card */}
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            {/* Left info area */}
            <div className="flex-1 p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 border border-violet-100 shadow-sm shrink-0">
                  <Download className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Agent Software</p>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">Reposys Print Agent</h2>
                  <p className="mt-1 text-sm text-slate-500 max-w-xl">
                    Desktop software for Windows workstations at the reprography counter. Connects to the backend and handles automated print job dispatch.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {agentInfo === null ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-400"><Loader2 className="h-3 w-3 animate-spin" /> Checking availability...</span>
                    ) : agentInfo.available ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Unavailable
                      </span>
                    )}
                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      v{agentInfo?.version || '—'}
                    </span>
                    {agentInfo?.notes && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Info className="h-3 w-3" />{agentInfo.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right download area */}
            <div className="md:w-72 bg-slate-50/50 border-t md:border-t-0 md:border-l border-slate-100 p-6 md:p-8 flex flex-col justify-center gap-4">
              <button
                id="btn-download-print-agent"
                disabled={!agentInfo?.available}
                onClick={() => window.open('/api/admin/print-agent/download', '_blank')}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  agentInfo?.available
                    ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow-md active:scale-95'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Download className="h-4 w-4" />
                Download Print Agent
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Agent Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Print Agent?</h3>
                <p className="mt-1 text-sm font-mono text-slate-500">{deleteConfirm.agentId}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700 space-y-1">
              <p className="font-semibold">This action cannot be undone.</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs mt-1">
                <li>Registration history will be permanently deleted.</li>
                <li>All associated printer records will be unlinked.</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeletingAgent}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAgent(deleteConfirm.agentId)}
                disabled={isDeletingAgent}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingAgent && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printer Delete Confirmation Modal */}
      {printerDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Permanently Delete Printer?</h3>
                <p className="mt-1 text-sm font-semibold text-slate-700">{printerDeleteConfirm.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">This printer will be removed from the database entirely.</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-red-50 border border-red-100 p-4 text-sm text-red-700 space-y-1">
              <p className="font-semibold">This action cannot be undone.</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs mt-1">
                <li>The printer record will be permanently removed from the database.</li>
                <li>Any pending print jobs assigned to this printer may fail.</li>
                <li>You can add this printer again from scratch at any time.</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPrinterDeleteConfirm(null)}
                disabled={isDeletingPrinter}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePrinter}
                disabled={isDeletingPrinter}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeletingPrinter && <Loader2 className="h-4 w-4 animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterManagement;
