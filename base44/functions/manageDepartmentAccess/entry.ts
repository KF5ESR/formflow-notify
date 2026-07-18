import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const DEPARTMENT_ROLES = new Set(['dept_admin', 'reviewer', 'user', 'viewer']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const actor = await base44.auth.me();
    if (!actor) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (actor.role !== 'admin') {
      return Response.json({ error: 'Only a Base44 administrator can manage department access.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'list';

    if (action === 'list') {
      const [users, departments] = await Promise.all([
        base44.asServiceRole.entities.User.list('full_name', 5000),
        base44.asServiceRole.entities.Department.list('department_name', 5000),
      ]);
      return Response.json({
        users: users.map((user) => ({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          app_role: user.app_role || (user.role === 'admin' ? 'super_admin' : 'user'),
          department_id: user.department_id || null,
          default_department_id: user.default_department_id || user.department_id || null,
          department_ids: user.department_ids || (user.department_id ? [user.department_id] : []),
          department_admin_ids: user.department_admin_ids || [],
          department_reviewer_ids: user.department_reviewer_ids || [],
          department_responder_ids: user.department_responder_ids || [],
        })),
        departments,
      });
    }

    if (action !== 'assign') {
      return Response.json({ error: 'Unsupported action.' }, { status: 400 });
    }

    const userId = String(body.user_id || '');
    const assignments = Array.isArray(body.assignments) ? body.assignments : [];
    if (!userId) return Response.json({ error: 'user_id is required.' }, { status: 400 });
    if (assignments.length > 100) return Response.json({ error: 'Too many department assignments.' }, { status: 400 });

    const departments = await base44.asServiceRole.entities.Department.list('department_name', 5000);
    const validDepartmentIds = new Set(departments.map((department) => department.id));
    const normalized = [];
    const seen = new Set();
    for (const assignment of assignments) {
      const departmentId = String(assignment?.department_id || '');
      const departmentRole = String(assignment?.role || 'viewer');
      if (!validDepartmentIds.has(departmentId) || !DEPARTMENT_ROLES.has(departmentRole)) {
        return Response.json({ error: 'An assignment contains an invalid department or role.' }, { status: 400 });
      }
      if (!seen.has(departmentId)) normalized.push({ department_id: departmentId, role: departmentRole });
      seen.add(departmentId);
    }

    const departmentIds = normalized.map((assignment) => assignment.department_id);
    const requestedDefault = String(body.default_department_id || '');
    const defaultDepartmentId = departmentIds.includes(requestedDefault) ? requestedDefault : departmentIds[0] || null;
    const idsFor = (roles) => normalized.filter((assignment) => roles.includes(assignment.role)).map((assignment) => assignment.department_id);

    const updated = await base44.asServiceRole.entities.User.update(userId, {
      app_role: body.app_role === 'super_admin' ? 'super_admin' : 'user',
      department_id: defaultDepartmentId,
      default_department_id: defaultDepartmentId,
      department_ids: departmentIds,
      department_admin_ids: idsFor(['dept_admin']),
      department_reviewer_ids: idsFor(['reviewer']),
      department_responder_ids: idsFor(['user']),
    });

    return Response.json({ success: true, user_id: updated.id });
  } catch (error) {
    return Response.json({ error: error?.message || 'Unexpected error.' }, { status: 500 });
  }
});
