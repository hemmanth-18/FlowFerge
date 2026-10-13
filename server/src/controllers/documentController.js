const SupabaseService = require('../services/supabaseService');

const documentController = {
  // GET /api/documents
  async getDocuments(req, res) {
    try {
      const userId = req.user?.id;
      const { teamId, workflowId, view, search } = req.query;

      let documents = await SupabaseService.getAllAccessibleDocuments(userId, {
        teamId: teamId || null,
        workflowId: workflowId || null,
        view: view || 'workflow',
      });

      if (search && typeof search === 'string') {
        const query = search.toLowerCase().trim();
        documents = documents.filter((d) => {
          return (
            d.fileName?.toLowerCase().includes(query) ||
            d.workflowName?.toLowerCase().includes(query) ||
            d.uploaderName?.toLowerCase().includes(query) ||
            d.description?.toLowerCase().includes(query)
          );
        });
      }

      return res.json({ success: true, data: documents });
    } catch (err) {
      console.error('[Get Documents Error]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve documents' });
    }
  },

  // GET /api/documents/received
  async getReceivedDocuments(req, res) {
    try {
      const userId = req.user?.id;
      const docs = await SupabaseService.getReceivedDocuments(userId);
      return res.json({ success: true, data: docs });
    } catch (err) {
      console.error('[Get Received Documents Error]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve received documents' });
    }
  },

  // GET /api/documents/my
  async getMyDocuments(req, res) {
    try {
      const userId = req.user?.id;
      const docs = await SupabaseService.getMyUploadedDocuments(userId);
      return res.json({ success: true, data: docs });
    } catch (err) {
      console.error('[Get My Documents Error]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to retrieve your documents' });
    }
  },

  // GET /api/documents/workflows/:workflowId/recipients
  async getWorkflowRecipients(req, res) {
    try {
      const userId = req.user?.id;
      const { workflowId } = req.params;

      if (!workflowId) {
        return res.status(400).json({ success: false, error: 'Workflow ID is required' });
      }

      const role = await SupabaseService.getWorkflowMemberRole(workflowId, userId);
      if (!role) {
        return res.status(403).json({ success: false, error: 'Access denied: You do not have access to this workflow' });
      }

      const members = await SupabaseService.getWorkflowMembers(workflowId);
      const sanitized = members.map((m) => ({
        id: m.id,
        name: m.name,
        username: m.username,
        email: m.email,
        avatarUrl: m.avatarUrl || null,
        role: m.role || 'MEMBER',
      }));

      return res.json({ success: true, data: sanitized });
    } catch (err) {
      console.error('[Get Workflow Recipients Error]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to load eligible workflow recipients' });
    }
  },

  // POST /api/documents/send
  async sendDocument(req, res) {
    try {
      const userId = req.user?.id;
      const file = req.file;
      const { workflowId, recipientIds, shareWithEntireWorkflow, description } = req.body;

      if (!file) {
        return res.status(400).json({ success: false, error: 'Please attach a document file (.pdf, .doc, .docx)' });
      }
      if (!workflowId) {
        return res.status(400).json({ success: false, error: 'Please select a workflow' });
      }

      let parsedRecipients = [];
      if (recipientIds) {
        if (Array.isArray(recipientIds)) {
          parsedRecipients = recipientIds;
        } else if (typeof recipientIds === 'string') {
          try {
            parsedRecipients = JSON.parse(recipientIds);
            if (!Array.isArray(parsedRecipients)) parsedRecipients = [recipientIds];
          } catch (e) {
            parsedRecipients = recipientIds.split(',').map((id) => id.trim()).filter(Boolean);
          }
        }
      }

      const isPublic = shareWithEntireWorkflow === true || shareWithEntireWorkflow === 'true';

      const document = await SupabaseService.saveWorkflowDocument({
        workflowId,
        file,
        uploadedBy: userId,
        description: description || '',
        recipientIds: parsedRecipients,
        shareWithEntireWorkflow: isPublic,
      });

      return res.status(201).json({
        success: true,
        message: document.isPrivate
          ? `Document sent privately (${document.visibilityLabel})`
          : 'Document shared with entire workflow',
        data: document,
      });
    } catch (err) {
      console.error('[Send Document Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to send document' });
    }
  },

  // GET /api/documents/:id/download
  async downloadDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const result = await SupabaseService.getDocumentDownloadUrl(id, userId);
      return res.json({
        success: true,
        downloadUrl: result.url,
        data: result.doc,
      });
    } catch (err) {
      console.error('[Download Document Error]:', err);
      const is404 = err.message === 'Document not found';
      return res.status(is404 ? 404 : 403).json({
        success: false,
        error: is404 ? 'Document not found' : err.message || 'Access denied',
      });
    }
  },

  // GET /api/documents/:id/preview
  async previewDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const preview = await SupabaseService.getDocumentPreview(id, userId);
      return res.json({
        success: true,
        data: preview.doc,
        previewUrl: preview.previewUrl,
        isPdf: preview.isPdf,
        isWord: preview.isWord,
      });
    } catch (err) {
      console.error('[Preview Document Error]:', err);
      const is404 = err.message === 'Document not found';
      return res.status(is404 ? 404 : 403).json({
        success: false,
        error: is404 ? 'Document not found' : err.message || 'Access denied',
      });
    }
  },

  // DELETE /api/documents/:id
  async deleteDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      await SupabaseService.deleteWorkflowDocument(id, userId);
      return res.json({ success: true, message: 'Document deleted successfully' });
    } catch (err) {
      console.error('[Delete Document Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to delete document' });
    }
  },
};

module.exports = documentController;
