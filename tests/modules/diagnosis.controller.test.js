'use strict';

const service = require('../../src/modules/diagnosis/diagnosis.service');
const controller = require('../../src/modules/diagnosis/diagnosis.controller');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  return {
    _status: 200,
    _body: null,
    status(code) {
      this._status = code;
      return this;
    },
    json(data) {
      this._body = data;
      return this;
    },
    end() {
      return this;
    },
  };
}

// ─── listForms ────────────────────────────────────────────────────────────────

describe('diagnosis controller — listForms', () => {
  it('calls service with activeOnly=true for anonymous requests (activeOnly=false ignored)', async () => {
    vi.spyOn(service, 'listForms').mockResolvedValue([]);
    const req = { adminRole: undefined, query: { activeOnly: 'false' } };
    const res = makeRes();

    await controller.listForms(req, res, vi.fn());

    expect(service.listForms).toHaveBeenCalledWith(true);
    expect(res._body).toEqual({ status: 'success', data: [] });
  });

  it('calls service with activeOnly=false when admin role is set and passes activeOnly=false', async () => {
    vi.spyOn(service, 'listForms').mockResolvedValue([]);
    const req = { adminRole: 'ADMIN', query: { activeOnly: 'false' } };

    await controller.listForms(req, makeRes(), vi.fn());

    expect(service.listForms).toHaveBeenCalledWith(false);
  });

  it('calls service with activeOnly=true when admin omits the param', async () => {
    vi.spyOn(service, 'listForms').mockResolvedValue([]);
    const req = { adminRole: 'MASTER', query: {} };

    await controller.listForms(req, makeRes(), vi.fn());

    expect(service.listForms).toHaveBeenCalledWith(true);
  });

  it('calls service with activeOnly=true when admin passes activeOnly=true explicitly', async () => {
    vi.spyOn(service, 'listForms').mockResolvedValue([]);
    const req = { adminRole: 'MASTER', query: { activeOnly: 'true' } };

    await controller.listForms(req, makeRes(), vi.fn());

    expect(service.listForms).toHaveBeenCalledWith(true);
  });

  it('forwards error to next on service failure', async () => {
    const err = new Error('db error');
    vi.spyOn(service, 'listForms').mockRejectedValue(err);
    const next = vi.fn();

    await controller.listForms({ adminRole: undefined, query: {} }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ─── getFormQuestions ─────────────────────────────────────────────────────────

describe('diagnosis controller — getFormQuestions', () => {
  it('returns form slug, title, description and sections', async () => {
    const form = { slug: 'commerce', title: 'Commerce', description: null, sections: [{ key: 's1' }] };
    vi.spyOn(service, 'getFormBySlug').mockResolvedValue(form);
    const req = { params: { slug: 'commerce' } };
    const res = makeRes();

    await controller.getFormQuestions(req, res, vi.fn());

    expect(service.getFormBySlug).toHaveBeenCalledWith('commerce');
    expect(res._body).toEqual({
      status: 'success',
      data: { slug: 'commerce', title: 'Commerce', description: null, sections: [{ key: 's1' }] },
    });
  });

  it('forwards 404 to next when form is not found', async () => {
    const err = { status: 404, message: "Form 'missing' not found" };
    vi.spyOn(service, 'getFormBySlug').mockRejectedValue(err);
    const next = vi.fn();

    await controller.getFormQuestions({ params: { slug: 'missing' } }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ─── createForm ───────────────────────────────────────────────────────────────

describe('diagnosis controller — createForm', () => {
  it('returns 201 with the created form', async () => {
    const form = { id: 'f-1', slug: 'new-form', title: 'New', sections: [] };
    vi.spyOn(service, 'createForm').mockResolvedValue(form);
    const req = { body: { slug: 'new-form', title: 'New', sections: [] } };
    const res = makeRes();

    await controller.createForm(req, res, vi.fn());

    expect(res._status).toBe(201);
    expect(res._body).toEqual({ status: 'success', data: form });
    expect(service.createForm).toHaveBeenCalledWith(req.body);
  });

  it('forwards 409 to next when slug already exists', async () => {
    const err = { status: 409, message: "Form with slug 'new-form' already exists" };
    vi.spyOn(service, 'createForm').mockRejectedValue(err);
    const next = vi.fn();

    await controller.createForm({ body: {} }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ─── updateForm ───────────────────────────────────────────────────────────────

describe('diagnosis controller — updateForm', () => {
  it('returns the updated form', async () => {
    const updated = { id: 'f-1', slug: 'commerce', title: 'Updated Commerce' };
    vi.spyOn(service, 'updateForm').mockResolvedValue(updated);
    const req = { params: { slug: 'commerce' }, body: { title: 'Updated Commerce' } };
    const res = makeRes();

    await controller.updateForm(req, res, vi.fn());

    expect(service.updateForm).toHaveBeenCalledWith('commerce', { title: 'Updated Commerce' });
    expect(res._body).toEqual({ status: 'success', data: updated });
  });

  it('forwards 404 to next when form does not exist', async () => {
    vi.spyOn(service, 'updateForm').mockRejectedValue({ status: 404, message: "Form 'ghost' not found" });
    const next = vi.fn();

    await controller.updateForm({ params: { slug: 'ghost' }, body: { title: 'X' } }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });

  it('forwards 400 to next when no valid fields are provided', async () => {
    vi.spyOn(service, 'updateForm').mockRejectedValue({
      status: 400,
      message: 'No valid fields provided for update',
    });
    const next = vi.fn();

    await controller.updateForm({ params: { slug: 'commerce' }, body: {} }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });
});

// ─── deleteForm ───────────────────────────────────────────────────────────────

describe('diagnosis controller — deleteForm', () => {
  it('responds with 204 and no body on success', async () => {
    vi.spyOn(service, 'deleteForm').mockResolvedValue(undefined);
    const endSpy = vi.fn().mockReturnThis();
    const statusSpy = vi.fn().mockReturnValue({ end: endSpy });

    await controller.deleteForm({ params: { slug: 'commerce' } }, { status: statusSpy, end: endSpy }, vi.fn());

    expect(service.deleteForm).toHaveBeenCalledWith('commerce');
    expect(statusSpy).toHaveBeenCalledWith(204);
    expect(endSpy).toHaveBeenCalled();
  });

  it('forwards 404 to next when form does not exist', async () => {
    vi.spyOn(service, 'deleteForm').mockRejectedValue({ status: 404 });
    const next = vi.fn();

    await controller.deleteForm({ params: { slug: 'ghost' } }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});

// ─── submitLead ───────────────────────────────────────────────────────────────

describe('diagnosis controller — submitLead', () => {
  it('returns 201 with the created lead', async () => {
    const lead = { id: 'lead-1', score: 45, leadTemperature: 'warm' };
    vi.spyOn(service, 'submitLead').mockResolvedValue(lead);
    const req = { body: { formType: 'commerce' } };
    const res = makeRes();

    await controller.submitLead(req, res, vi.fn());

    expect(res._status).toBe(201);
    expect(res._body).toEqual({ status: 'success', data: lead });
    expect(service.submitLead).toHaveBeenCalledWith(req.body);
  });

  it('forwards validation error to next', async () => {
    const err = { status: 400, message: "Field 'name' is required" };
    vi.spyOn(service, 'submitLead').mockRejectedValue(err);
    const next = vi.fn();

    await controller.submitLead({ body: {} }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(err);
  });
});

// ─── listLeads ────────────────────────────────────────────────────────────────

describe('diagnosis controller — listLeads', () => {
  it('builds a complete filter object from all supported query params', async () => {
    vi.spyOn(service, 'listLeads').mockResolvedValue([]);
    const req = {
      query: {
        formType: 'health',
        status: 'new',
        leadTemperature: 'hot',
        segment: 'clinic',
        state: 'SP',
        city: 'São Paulo',
        operationSize: 'small',
        marketTime: '5+',
        mainChallenge: 'visibility',
      },
    };
    const res = makeRes();

    await controller.listLeads(req, res, vi.fn());

    expect(service.listLeads).toHaveBeenCalledWith({
      formType: 'health',
      status: 'new',
      leadTemperature: 'hot',
      segment: 'clinic',
      state: 'SP',
      city: 'São Paulo',
      operationSize: 'small',
      marketTime: '5+',
      mainChallenge: 'visibility',
    });
    expect(res._body).toEqual({ status: 'success', data: [] });
  });

  it('passes undefined for absent query params', async () => {
    vi.spyOn(service, 'listLeads').mockResolvedValue([]);

    await controller.listLeads({ query: {} }, makeRes(), vi.fn());

    expect(service.listLeads).toHaveBeenCalledWith(
      expect.objectContaining({ formType: undefined, status: undefined, leadTemperature: undefined }),
    );
  });

  it('forwards error to next on service failure', async () => {
    vi.spyOn(service, 'listLeads').mockRejectedValue(new Error('db error'));
    const next = vi.fn();

    await controller.listLeads({ query: {} }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── getLeadById ──────────────────────────────────────────────────────────────

describe('diagnosis controller — getLeadById', () => {
  it('returns the lead with 200', async () => {
    const lead = { id: 'lead-42', score: 70, leadTemperature: 'hot' };
    vi.spyOn(service, 'getLeadById').mockResolvedValue(lead);
    const req = { params: { id: 'lead-42' } };
    const res = makeRes();

    await controller.getLeadById(req, res, vi.fn());

    expect(service.getLeadById).toHaveBeenCalledWith('lead-42');
    expect(res._body).toEqual({ status: 'success', data: lead });
  });

  it('forwards 404 to next when lead is not found', async () => {
    vi.spyOn(service, 'getLeadById').mockRejectedValue({ status: 404, message: 'Lead not found' });
    const next = vi.fn();

    await controller.getLeadById({ params: { id: 'missing' } }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});

// ─── updateLeadStatus ─────────────────────────────────────────────────────────

describe('diagnosis controller — updateLeadStatus', () => {
  it('returns the updated lead with new status', async () => {
    const updated = { id: 'lead-1', status: 'qualified' };
    vi.spyOn(service, 'updateLeadStatus').mockResolvedValue(updated);
    const req = { params: { id: 'lead-1' }, body: { status: 'qualified' } };
    const res = makeRes();

    await controller.updateLeadStatus(req, res, vi.fn());

    expect(service.updateLeadStatus).toHaveBeenCalledWith('lead-1', 'qualified');
    expect(res._body).toEqual({ status: 'success', data: updated });
  });

  it('forwards 400 to next for invalid status value', async () => {
    vi.spyOn(service, 'updateLeadStatus').mockRejectedValue({
      status: 400,
      message: 'Invalid status. Allowed values: new, contacted, qualified, proposal, lost, client',
    });
    const next = vi.fn();

    await controller.updateLeadStatus(
      { params: { id: 'lead-1' }, body: { status: 'invalid' } },
      makeRes(),
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
  });

  it('forwards 404 to next when lead does not exist', async () => {
    vi.spyOn(service, 'updateLeadStatus').mockRejectedValue({ status: 404, message: 'Lead not found' });
    const next = vi.fn();

    await controller.updateLeadStatus({ params: { id: 'gone' }, body: { status: 'new' } }, makeRes(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 404 }));
  });
});
