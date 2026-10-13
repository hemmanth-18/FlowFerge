const SupabaseService = require('../services/supabaseService');

const graphController = {
  // GET /api/workflows/:id/graph
  async getWorkflowGraph(req, res) {
    try {
      const { id } = req.params;
      const wf = await SupabaseService.getWorkflowById(id);
      if (!wf) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      // Fetch all tasks for this workflow from Supabase/memoryDb
      const tasks = await SupabaseService.getTasksByWorkflow(id);
      const existingNodes = Array.isArray(wf.nodes) ? wf.nodes : [];
      const nodeMap = new Map();
      existingNodes.forEach((n) => {
        if (n && n.id) nodeMap.set(n.id, n);
      });

      // Synchronize nodes: Ensure every task has a node on the canvas
      const syncedNodes = tasks.map((task, index) => {
        const existing = nodeMap.get(task.id);
        const position = existing?.position || task.position || {
          x: 220 + (index % 3) * 280,
          y: 80 + Math.floor(index / 3) * 180,
        };

        return {
          id: task.id,
          type: 'taskNode',
          position,
          data: {
            task,
          },
        };
      });

      // Keep existing nodes that have task data if not already mapped
      const syncedNodeIds = new Set(syncedNodes.map((n) => n.id));
      existingNodes.forEach((node) => {
        if (node && node.id && !syncedNodeIds.has(node.id) && node.data?.task) {
          syncedNodes.push(node);
        }
      });

      // If wf.nodes was empty or out of sync, update workflow nodes in storage
      if (syncedNodes.length > 0 && existingNodes.length !== syncedNodes.length) {
        wf.nodes = syncedNodes;
        await SupabaseService.saveGraphState(id, { nodes: syncedNodes, dependencies: wf.dependencies || [] }, req.user?.id);
      }

      const userRole = req.workflowRole || (wf.ownerId === req.user?.id || wf.createdBy === req.user?.id ? 'OWNER' : 'MEMBER');

      res.json({
        success: true,
        data: {
          workflow: {
            ...wf,
            userRole,
          },
          nodes: syncedNodes,
          edges: Array.isArray(wf.dependencies) ? wf.dependencies : [],
          tasks,
        },
      });
    } catch (err) {
      console.error('[Get Graph Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch workflow graph' });
    }
  },

  // PUT /api/workflows/:id/graph
  async saveWorkflowGraph(req, res) {
    try {
      const { id } = req.params;
      const { nodes, edges } = req.body;

      if (!Array.isArray(nodes) || !Array.isArray(edges)) {
        return res.status(400).json({ success: false, error: 'Nodes and edges must be arrays' });
      }

      await SupabaseService.saveGraphState(id, { nodes, dependencies: edges }, req.user?.id);
      res.json({ success: true, message: 'Workflow graph saved successfully' });
    } catch (err) {
      console.error('[Save Graph Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to save workflow graph' });
    }
  },
};

module.exports = graphController;
