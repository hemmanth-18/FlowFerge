const SupabaseService = require('./supabaseService');

const AutomationEngine = {
  /**
   * Main entry point when an event occurs in the system
   * @param {string} triggerType - e.g. 'TASK_COMPLETED', 'TASK_STATUS_CHANGED', 'TASK_CREATED'
   * @param {object} context - { workflowId, task, user, previousState, depth }
   */
  async dispatchEvent(triggerType, context) {
    const { workflowId, task, user, depth = 0 } = context;

    // Loop & recursion protection (max depth 3)
    if (depth > 3) {
      console.warn(`[AutomationEngine] Max execution depth reached for workflow ${workflowId}. Stopping loop.`);
      return;
    }

    if (!workflowId) return;

    try {
      // 1. Verify Workflow & Team boundaries
      const workflow = await SupabaseService.getWorkflowById(workflowId);
      if (!workflow) {
        console.warn(`[AutomationEngine] Workflow ${workflowId} not found. Boundary abort.`);
        return;
      }

      const teamId = workflow.teamId;

      // Verify task belongs to this workflow & team
      if (task) {
        if (task.workflowId && task.workflowId !== workflowId) {
          console.warn(`[AutomationEngine] Cross-workflow execution rejected: ${task.workflowId} != ${workflowId}`);
          return;
        }
        if (teamId && task.teamId && task.teamId !== teamId) {
          console.warn(`[AutomationEngine] Cross-team execution rejected: ${task.teamId} != ${teamId}`);
          return;
        }
      }

      // 2. Fetch all enabled automation rules for this workflow
      const rules = await SupabaseService.getAutomationsByWorkflow(workflowId);
      const activeRules = rules.filter((r) => r.enabled && r.trigger === triggerType);

      let actionExecuted = false;
      for (const rule of activeRules) {
        const isMatched = this.evaluateCondition(rule.condition, context);
        if (isMatched) {
          await this.executeAction(rule, { ...context, teamId }, depth);
          actionExecuted = true;
        }
      }

      // 3. Built-in Graph DAG task activation on TASK_COMPLETED
      if (triggerType === 'TASK_COMPLETED' && task) {
        await this.traverseDagAndActivateNext(workflowId, task, teamId, user, depth);
      }
    } catch (err) {
      console.error(`[AutomationEngine] Execution error on workflow ${workflowId}:`, err);
    }
  },

  async traverseDagAndActivateNext(workflowId, task, teamId, user, depth) {
    const wf = await SupabaseService.getWorkflowById(workflowId);
    let edges = wf?.dependencies || [];
    if (!Array.isArray(edges)) {
      const edgeList = [];
      for (const [targetId, sourceIds] of Object.entries(edges)) {
        const sArr = Array.isArray(sourceIds) ? sourceIds : [sourceIds];
        for (const s of sArr) {
          edgeList.push({ source: s, target: targetId });
        }
      }
      edges = edgeList;
    }

    const allTasks = await SupabaseService.getTasksByWorkflow(workflowId);
    for (const otherTask of allTasks) {
      if (otherTask.dependencies && otherTask.dependencies.includes(task.id)) {
        if (!edges.some((e) => e.source === task.id && e.target === otherTask.id)) {
          edges.push({ source: task.id, target: otherTask.id });
        }
      }
    }

    const outgoingEdges = edges.filter((e) => e.source === task.id);
    for (const edge of outgoingEdges) {
      const downstreamTask = await SupabaseService.getTaskById(edge.target);
      if (!downstreamTask || downstreamTask.status === 'COMPLETED' || downstreamTask.status === 'IN_PROGRESS') continue;

      const updated = await SupabaseService.updateTask(downstreamTask.id, { status: 'IN_PROGRESS' }, 'system:automation');

      if (teamId) {
        await SupabaseService.logTeamActivity(teamId, {
          action: 'AUTOMATION_TRIGGERED',
          details: `Task "${updated.title}" activated following completion of "${task.title}"`,
          userId: user?.id || 'system',
          userName: user?.name || 'Automation Engine',
          workflowId,
          taskId: updated.id,
        });
      }
    }
  },

  evaluateCondition(condition, context) {
    if (!condition || !condition.field) return true; // No condition means always execute
    const { task } = context;
    if (!task) return false;

    const { field, operator, value } = condition;
    const taskValue = task[field];

    if (taskValue === undefined || taskValue === null) return false;

    const strTaskVal = String(taskValue).toLowerCase().trim();
    const strConditionVal = String(value).toLowerCase().trim();

    switch (operator) {
      case 'equals':
        return strTaskVal === strConditionVal;
      case 'not_equals':
        return strTaskVal !== strConditionVal;
      case 'contains':
        return strTaskVal.includes(strConditionVal);
      case 'greater_than':
        return Number(taskValue) > Number(value);
      case 'less_than':
        return Number(taskValue) < Number(value);
      default:
        return strTaskVal === strConditionVal;
    }
  },

  async executeAction(rule, context, depth) {
    const { workflowId, task, user } = context;
    let teamId = context.teamId;
    if (!teamId && workflowId) {
      const wf = await SupabaseService.getWorkflowById(workflowId);
      teamId = wf?.teamId;
    }
    const { action } = rule;
    if (!action || !action.type) return;

    const logDetails = {
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      actionType: action.type,
      status: 'SUCCESS',
      details: '',
    };

    try {
      switch (action.type) {
        // 1. ACTIVATE NEXT TASK (Graph DAG Traversal)
        case 'ACTIVATE_NEXT_TASK': {
          if (!task) break;
          const wf = await SupabaseService.getWorkflowById(workflowId);
          const edges = wf?.dependencies || [];

          // Find all downstream target tasks
          const outgoingEdges = edges.filter((e) => e.source === task.id);
          if (outgoingEdges.length === 0) {
            logDetails.details = `Task "${task.title}" has no downstream tasks connected in graph.`;
            break;
          }

          const activatedTasks = [];
          for (const edge of outgoingEdges) {
            const downstreamTask = await SupabaseService.getTaskById(edge.target);
            if (!downstreamTask) continue;

            // Strict anti-cross-team boundary enforcement
            if (
              downstreamTask.workflowId !== workflowId ||
              (downstreamTask.teamId && teamId && downstreamTask.teamId !== teamId)
            ) {
              console.warn(`[AutomationEngine] Cross-team/workflow boundary blocked for task ${downstreamTask.id}`);
              continue;
            }

            const updates = {
              status: action.params?.newStatus || 'IN_PROGRESS',
            };

            if (action.params?.targetAssignee) {
              updates.assignedTo = action.params.targetAssignee;
            }

            const updated = await SupabaseService.updateTask(downstreamTask.id, updates, 'system:automation');
            activatedTasks.push(updated);

            // Notify Assignee
            if (updated.assignedTo) {
              await SupabaseService.createNotification(updated.assignedTo, {
                title: 'Task Automatically Activated',
                message: `Task "${updated.title}" is now active and ready for work in workflow.`,
                type: 'TASK_ACTIVATED',
                link: `/workflows/${workflowId}`,
              });
            }

            // Cascade dispatch to downstream if auto-action changed status
            await this.dispatchEvent('TASK_STATUS_CHANGED', {
              workflowId,
              task: updated,
              user,
              depth: depth + 1,
            });
          }

          logDetails.details = `Activated ${activatedTasks.length} downstream tasks: ${activatedTasks.map((t) => t.title).join(', ')}`;
          break;
        }

        // 2. ASSIGN / REASSIGN TASK
        case 'ASSIGN_TASK':
        case 'REASSIGN_TASK': {
          const targetTaskId = action.params?.taskId || task?.id;
          const targetAssignee = action.params?.targetAssignee;

          if (!targetTaskId || !targetAssignee) {
            throw new Error('Target task ID and assignee are required');
          }

          const updated = await SupabaseService.updateTask(targetTaskId, { assignedTo: targetAssignee }, 'system:automation');

          await SupabaseService.createNotification(targetAssignee, {
            title: 'Task Assigned by Automation',
            message: `Task "${updated.title}" was assigned to you via workflow automation "${rule.name}".`,
            type: 'TASK_ASSIGNED',
            link: `/tasks`,
          });

          logDetails.details = `Assigned task "${updated.title}" to ${targetAssignee}`;
          break;
        }

        // 3. CHANGE STATUS OR PRIORITY OR DUE DATE
        case 'CHANGE_STATUS': {
          const targetTaskId = action.params?.taskId || task?.id;
          if (!targetTaskId || !action.params?.newStatus) break;
          const updated = await SupabaseService.updateTask(targetTaskId, { status: action.params.newStatus }, 'system:automation');
          logDetails.details = `Changed status of "${updated.title}" to ${action.params.newStatus}`;
          break;
        }

        case 'CHANGE_PRIORITY': {
          const targetTaskId = action.params?.taskId || task?.id;
          if (!targetTaskId || !action.params?.newPriority) break;
          const updated = await SupabaseService.updateTask(targetTaskId, { priority: action.params.newPriority }, 'system:automation');
          logDetails.details = `Changed priority of "${updated.title}" to ${action.params.newPriority}`;
          break;
        }

        case 'SET_DUE_DATE': {
          const targetTaskId = action.params?.taskId || task?.id;
          if (!targetTaskId || !action.params?.dueDate) break;
          const updated = await SupabaseService.updateTask(targetTaskId, { dueDate: action.params.dueDate }, 'system:automation');
          logDetails.details = `Set due date of "${updated.title}" to ${action.params.dueDate}`;
          break;
        }

        // 4. CREATE TASK VIA AUTOMATION
        case 'CREATE_TASK': {
          if (!action.params?.title) break;
          const newTask = await SupabaseService.createTask('system:automation', {
            workflowId,
            title: action.params.title,
            description: action.params.description || 'Created by automation rule',
            priority: action.params.priority || 'MEDIUM',
            assignedTo: action.params.targetAssignee,
            status: action.params.status || 'TODO',
          });
          logDetails.details = `Created new task "${newTask.title}" via automation`;
          break;
        }

        // 5. SEND NOTIFICATION
        case 'SEND_NOTIFICATION': {
          const targetUser = action.params?.recipient || task?.assignedTo || user?.id;
          if (targetUser) {
            await SupabaseService.createNotification(targetUser, {
              title: action.params?.title || `Automation: ${rule.name}`,
              message: action.params?.message || `Workflow rule "${rule.name}" triggered on "${task?.title || 'workflow'}".`,
              type: 'AUTOMATION_EXECUTED',
              link: `/workflows/${workflowId}`,
            });
            logDetails.details = `Sent notification to ${targetUser}`;
          }
          break;
        }

        default:
          logDetails.details = `Executed custom action ${action.type}`;
      }

      // Record Execution Log
      await SupabaseService.logAutomationExecution(workflowId, logDetails);

      if (teamId) {
        await SupabaseService.logTeamActivity(teamId, {
          userId: user?.id || 'system:automation',
          userName: user?.name || 'Automation Engine',
          action: 'AUTOMATION_EXECUTED',
          details: `Rule "${rule.name}": ${logDetails.details}`,
          workflowId,
        });

        await SupabaseService.logAudit({
          userId: user?.id || 'system:automation',
          userName: user?.name || 'Automation Engine',
          action: 'EXECUTE_AUTOMATION',
          resourceType: 'AUTOMATION',
          resourceId: rule.id,
          result: 'SUCCESS',
          teamId,
          workflowId,
        });
      }
    } catch (err) {
      logDetails.status = 'FAILED';
      logDetails.details = `Execution error: ${err.message}`;
      await SupabaseService.logAutomationExecution(workflowId, logDetails);

      if (teamId) {
        await SupabaseService.logAudit({
          userId: user?.id || 'system:automation',
          userName: user?.name || 'Automation Engine',
          action: 'EXECUTE_AUTOMATION',
          resourceType: 'AUTOMATION',
          resourceId: rule.id,
          result: 'DENIED',
          reason: err.message,
          teamId,
          workflowId,
        });
      }
    }
  },
};

module.exports = AutomationEngine;
