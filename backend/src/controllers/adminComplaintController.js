import { prisma } from '../config/prismaClient.js';
import { checkOverdueComplaints, getEscalationDays } from '../services/escalationService.js';

// Pre-seeded Departments list
export const SAMPLE_DEPARTMENTS = [
  { id: 'dept-1', name: 'Sanitation & Waste Management', code: 'SAN' },
  { id: 'dept-2', name: 'Public Works & Roads', code: 'PWR' },
  { id: 'dept-3', name: 'Water Supply & Drainage', code: 'WSD' },
  { id: 'dept-4', name: 'Electricity & Lighting', code: 'ELE' },
  { id: 'dept-5', name: 'Food & Civil Supplies', code: 'FCS' },
  { id: 'dept-6', name: 'Public Health & Education', code: 'PHE' },
];

// Pre-seeded Officers list
export const SAMPLE_OFFICERS = [
  { id: 'off-1', name: 'Rajiv Das', email: 'rajiv.das@sevanest.gov.in', designation: 'Block Officer · Uluberia-I' },
  { id: 'off-2', name: 'Ananya Sharma', email: 'ananya.s@sevanest.gov.in', designation: 'Assistant Engineer · Public Works' },
  { id: 'off-3', name: 'Bikramjit Roy', email: 'bikramjit.r@sevanest.gov.in', designation: 'Sanitation Inspector' },
  { id: 'off-4', name: 'Sunita Paul', email: 'sunita.p@sevanest.gov.in', designation: 'Public Health Officer' },
];

// Comprehensive sample complaints dataset with audit logs, remarks, and escalation flags
export const SAMPLE_COMPLAINTS = [
  {
    id: 'c-1001',
    ref: 'SR-1001',
    title: 'Water Supply Disruption in Ward 12',
    description: 'Severe drinking water supply interruption reported in Ward 12 since morning. Residents requesting immediate tanker supply and pipe inspection.',
    location: 'Ward 12, Durganagar, Uluberia-I',
    latitude: 22.4831,
    longitude: 88.1092,
    status: 'OPEN',
    category: 'WATER_SUPPLY',
    priority: 'HIGH',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?w=800&auto=format&fit=crop&q=60',
    isEscalated: false,
    escalationLevel: 0,
    escalatedAt: null,
    assignedDepartment: null,
    assignedOfficer: null,
    createdAt: '2026-08-08T09:15:00.000Z',
    updatedAt: '2026-08-08T09:15:00.000Z',
    citizen: {
      id: 'u-101',
      name: 'Asha Verma',
      email: 'asha.verma@example.com',
      phone: '+91 98765 43210',
      role: 'CITIZEN',
      state: 'WEST_BENGAL'
    },
    remarks: [],
    statusHistory: [
      {
        id: 'h-1001-1',
        previousStatus: null,
        newStatus: 'OPEN',
        changedBy: 'System Administrator',
        remark: 'Complaint filed by citizen.',
        createdAt: '2026-08-08T09:15:00.000Z'
      }
    ]
  },
  {
    id: 'c-1002',
    ref: 'SR-1002',
    title: 'Street Light Outage on College Road',
    description: 'Multiple streetlights non-functional along the main college road stretch creating safety hazards during night hours.',
    location: 'College Road, Block B, Ward 6',
    latitude: 22.4850,
    longitude: 88.1120,
    status: 'ASSIGNED',
    category: 'ELECTRICITY',
    priority: 'MEDIUM',
    imageUrl: null,
    isEscalated: false,
    escalationLevel: 0,
    escalatedAt: null,
    assignedDepartment: { id: 'dept-4', name: 'Electricity & Lighting', code: 'ELE' },
    assignedOfficer: { id: 'off-2', name: 'Ananya Sharma', email: 'ananya.s@sevanest.gov.in', designation: 'Assistant Engineer · Public Works' },
    createdAt: '2026-08-07T18:40:00.000Z',
    updatedAt: '2026-08-08T10:00:00.000Z',
    citizen: {
      id: 'u-102',
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar@example.com',
      phone: '+91 98123 45678',
      role: 'CITIZEN',
      state: 'WEST_BENGAL'
    },
    remarks: [
      {
        id: 'r-1002-1',
        adminName: 'System Administrator',
        remark: 'Assigned to Assistant Engineer Ananya Sharma for urgent circuit inspection.',
        createdAt: '2026-08-08T10:00:00.000Z'
      }
    ],
    statusHistory: [
      {
        id: 'h-1002-1',
        previousStatus: null,
        newStatus: 'OPEN',
        changedBy: 'Citizen',
        remark: 'Complaint created.',
        createdAt: '2026-08-07T18:40:00.000Z'
      },
      {
        id: 'h-1002-2',
        previousStatus: 'OPEN',
        newStatus: 'ASSIGNED',
        changedBy: 'System Administrator',
        remark: 'Assigned to Electricity & Lighting department.',
        createdAt: '2026-08-08T10:00:00.000Z'
      }
    ]
  },
  {
    id: 'c-1003',
    ref: 'SR-1003',
    title: 'Pothole Repair Request near Station Road',
    description: 'Large pothole developed near station intersection causing traffic congestion and small vehicle damage.',
    location: 'Station Road, Ward 4',
    latitude: 22.4812,
    longitude: 88.1050,
    status: 'IN_PROGRESS',
    category: 'ROADS',
    priority: 'HIGH',
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60',
    isEscalated: false,
    escalationLevel: 0,
    escalatedAt: null,
    assignedDepartment: { id: 'dept-2', name: 'Public Works & Roads', code: 'PWR' },
    assignedOfficer: { id: 'off-2', name: 'Ananya Sharma', email: 'ananya.s@sevanest.gov.in', designation: 'Assistant Engineer · Public Works' },
    createdAt: '2026-08-06T14:20:00.000Z',
    updatedAt: '2026-08-07T10:11:00.000Z',
    citizen: {
      id: 'u-103',
      name: 'Priya Roy',
      email: 'priya.roy@example.com',
      phone: '+91 98345 67890',
      role: 'CITIZEN',
      state: 'WEST_BENGAL'
    },
    remarks: [],
    statusHistory: []
  },
  {
    id: 'c-1004',
    ref: 'SR-1004',
    title: 'Garbage Collection Delay in Market Area',
    description: 'Waste accumulation near vegetable market complex due to missed morning collection round.',
    location: 'Market Complex Area, Ward 9',
    latitude: 22.4870,
    longitude: 88.1140,
    status: 'IN_PROGRESS',
    category: 'SANITATION',
    priority: 'HIGH',
    imageUrl: null,
    isEscalated: false,
    escalationLevel: 0,
    escalatedAt: null,
    assignedDepartment: { id: 'dept-1', name: 'Sanitation & Waste Management', code: 'SAN' },
    assignedOfficer: { id: 'off-3', name: 'Bikramjit Roy', email: 'bikramjit.r@sevanest.gov.in', designation: 'Sanitation Inspector' },
    createdAt: '2026-08-06T11:00:00.000Z',
    updatedAt: '2026-08-07T08:30:00.000Z',
    citizen: {
      id: 'u-104',
      name: 'Anil Banerji',
      email: 'anil.b@example.com',
      phone: '+91 98761 23456',
      role: 'CITIZEN',
      state: 'WEST_BENGAL'
    },
    remarks: [],
    statusHistory: []
  },
  {
    id: 'c-1005',
    ref: 'SR-1005',
    title: 'Drainage Overflow Concern in Purba Para',
    description: 'Blockage in stormwater drain resulting in dirty water overflow onto residential pathway.',
    location: 'Purba Para, Ward 8',
    latitude: 22.4790,
    longitude: 88.1020,
    status: 'IN_PROGRESS',
    category: 'SANITATION',
    priority: 'HIGH',
    imageUrl: null,
    isEscalated: false,
    escalationLevel: 0,
    escalatedAt: null,
    assignedDepartment: { id: 'dept-1', name: 'Sanitation & Waste Management', code: 'SAN' },
    assignedOfficer: { id: 'off-3', name: 'Bikramjit Roy', email: 'bikramjit.r@sevanest.gov.in', designation: 'Sanitation Inspector' },
    createdAt: '2026-08-05T16:45:00.000Z',
    updatedAt: '2026-08-06T09:15:00.000Z',
    citizen: {
      id: 'u-105',
      name: 'Suman Mondal',
      email: 'suman.mondal@example.com',
      phone: '+91 98234 56789',
      role: 'CITIZEN',
      state: 'WEST_BENGAL'
    },
    remarks: [],
    statusHistory: []
  },
  {
    id: 'c-1006',
    ref: 'SR-1006',
    title: 'Ration Shop Stock Availability Query',
    description: 'Complaint regarding stock arrival timing and token distribution system at Fair Price Shop 14.',
    location: 'Fair Price Shop 14, Ward 3',
    latitude: 22.4845,
    longitude: 88.1105,
    status: 'RESOLVED',
    category: 'FOOD_RATION',
    priority: 'MEDIUM',
    imageUrl: null,
    isEscalated: false,
    escalationLevel: 0,
    escalatedAt: null,
    assignedDepartment: { id: 'dept-5', name: 'Food & Civil Supplies', code: 'FCS' },
    assignedOfficer: { id: 'off-1', name: 'Rajiv Das', email: 'rajiv.das@sevanest.gov.in', designation: 'Block Officer · Uluberia-I' },
    createdAt: '2026-08-04T10:00:00.000Z',
    updatedAt: '2026-08-05T15:30:00.000Z',
    citizen: {
      id: 'u-106',
      name: 'Meena Mukherji',
      email: 'meena.m@example.com',
      phone: '+91 98456 78901',
      role: 'CITIZEN',
      state: 'WEST_BENGAL'
    },
    remarks: [],
    statusHistory: []
  },
  {
    id: 'c-1007',
    ref: 'SR-1007',
    title: 'Mid-day Meal Inspection Request',
    description: 'Parent request for quality verification of afternoon meal served at Primary School Ward 2.',
    location: 'Primary School Ward 2, Block A',
    latitude: 22.4862,
    longitude: 88.1080,
    status: 'RESOLVED',
    category: 'PUBLIC_HEALTH',
    priority: 'MEDIUM',
    imageUrl: null,
    isEscalated: false,
    escalationLevel: 0,
    escalatedAt: null,
    assignedDepartment: { id: 'dept-6', name: 'Public Health & Education', code: 'PHE' },
    assignedOfficer: { id: 'off-4', name: 'Sunita Paul', email: 'sunita.p@sevanest.gov.in', designation: 'Public Health Officer' },
    createdAt: '2026-08-03T12:15:00.000Z',
    updatedAt: '2026-08-04T16:00:00.000Z',
    citizen: {
      id: 'u-107',
      name: 'Tapan Sengupta',
      email: 'tapan.s@example.com',
      phone: '+91 98567 89012',
      role: 'CITIZEN',
      state: 'WEST_BENGAL'
    },
    remarks: [],
    statusHistory: []
  },
  {
    id: 'c-1008',
    ref: 'SR-1008',
    title: 'Pipeline Leakage Urgent near Hospital Gate',
    description: 'High-pressure water main pipe leaking heavily near hospital entrance gate, wasting drinking water and eroding road shoulder.',
    location: 'Hospital Gate Ward 5, Uluberia',
    latitude: 22.4820,
    longitude: 88.1070,
    status: 'ESCALATED',
    category: 'WATER_SUPPLY',
    priority: 'HIGH',
    imageUrl: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=800&auto=format&fit=crop&q=60',
    isEscalated: true,
    escalationLevel: 1,
    escalatedAt: '2026-08-03T11:20:00.000Z',
    assignedDepartment: { id: 'dept-3', name: 'Water Supply & Drainage', code: 'WSD' },
    assignedOfficer: { id: 'off-1', name: 'Rajiv Das', email: 'rajiv.das@sevanest.gov.in', designation: 'Block Officer · Uluberia-I' },
    createdAt: '2026-07-25T08:30:00.000Z',
    updatedAt: '2026-08-03T11:20:00.000Z',
    citizen: {
      id: 'u-108',
      name: 'Subhash Ghosh',
      email: 'subhash.ghosh@example.com',
      phone: '+91 98678 90123',
      role: 'CITIZEN',
      state: 'WEST_BENGAL'
    },
    remarks: [],
    statusHistory: [
      {
        id: 'h-1008-1',
        previousStatus: 'IN_PROGRESS',
        newStatus: 'ESCALATED',
        changedBy: 'SYSTEM (Automated Overdue Engine)',
        remark: 'Escalated to Level 1 — Complaint remained unresolved beyond 7 days.',
        createdAt: '2026-08-03T11:20:00.000Z'
      }
    ]
  }
];

export const SAMPLE_COMPLAINTS_REF = SAMPLE_COMPLAINTS;

/**
 * Helper to infer category if missing in database record
 */
function filterSampleComplaints({
  search = '',
  statusFilter = '',
  categoryFilter = '',
  priorityFilter = '',
  escalatedFilter = '',
  dateFilter = '',
  page = 1,
  limit = 20,
}) {
  let filtered = [...SAMPLE_COMPLAINTS];

  if (statusFilter && statusFilter !== 'ALL') {
    filtered = filtered.filter(c => c.status === statusFilter);
  }

  if (categoryFilter && categoryFilter !== 'ALL') {
    filtered = filtered.filter(c => c.category === categoryFilter);
  }

  if (priorityFilter && priorityFilter !== 'ALL') {
    filtered = filtered.filter(c => c.priority === priorityFilter);
  }

  if (escalatedFilter === 'true') {
    filtered = filtered.filter(c => c.isEscalated === true);
  } else if (escalatedFilter === 'false') {
    filtered = filtered.filter(c => c.isEscalated === false);
  }

  if (search) {
    filtered = filtered.filter(c =>
      c.ref.toLowerCase().includes(search) ||
      c.title.toLowerCase().includes(search) ||
      c.description.toLowerCase().includes(search) ||
      c.location.toLowerCase().includes(search)
    );
  }

  if (dateFilter) {
    filtered = filtered.filter(c => c.createdAt.startsWith(dateFilter));
  }

  return {
    complaints: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length,
  };
}

/** Admin users receive complaint details, never reporter identity. */
function anonymizeComplaint(complaint) {
  const { citizen, ...anonymousComplaint } = complaint;
  return anonymousComplaint;
}

/** Helper to infer category if missing in database record */
function inferCategory(title = '', desc = '') {
  const text = `${title} ${desc}`.toLowerCase();
  if (text.includes('water') || text.includes('pipe') || text.includes('drain')) return 'WATER_SUPPLY';
  if (text.includes('light') || text.includes('electric') || text.includes('power')) return 'ELECTRICITY';
  if (text.includes('road') || text.includes('pothole') || text.includes('bridge')) return 'ROADS';
  if (text.includes('garbage') || text.includes('clean') || text.includes('waste') || text.includes('sanitat')) return 'SANITATION';
  if (text.includes('ration') || text.includes('food') || text.includes('meal')) return 'FOOD_RATION';
  if (text.includes('health') || text.includes('hospital') || text.includes('doctor')) return 'PUBLIC_HEALTH';
  return 'OTHER';
}

/** Helper to infer priority if missing in database record */
function inferPriority(status) {
  if (status === 'ESCALATED') return 'CRITICAL';
  if (status === 'PENDING' || status === 'OPEN') return 'HIGH';
  if (status === 'IN_PROGRESS' || status === 'ASSIGNED') return 'MEDIUM';
  return 'LOW';
}

/** Format database complaint record into API shape */
function formatComplaintRecord(comp) {
  const category = comp.category || inferCategory(comp.title, comp.description);
  const priority = (comp.priority || inferPriority(comp.status)).toUpperCase();

  return {
    id: comp.id,
    ref: comp.ref || `CMP-${comp.id.slice(0, 6)}`,
    title: comp.title,
    description: comp.description || 'No detailed description provided.',
    status: comp.status,
    category,
    priority,
    location: comp.location || 'Uluberia-I Block',
    latitude: comp.latitude || 22.4831,
    longitude: comp.longitude || 88.1092,
    imageUrl: comp.imageUrl || comp.photoUrl || null,
    evidence: comp.evidence || [],
    isEscalated: Boolean(comp.isEscalated),
    escalationLevel: comp.escalationLevel || (comp.isEscalated ? 1 : 0),
    escalatedAt: comp.escalatedAt || null,
    assignedDepartment: comp.assignedDepartment || null,
    assignedOfficer: comp.assignedOfficer ? {
      id: comp.assignedOfficer.id,
      name: comp.assignedOfficer.fullName || comp.assignedOfficer.name,
      email: comp.assignedOfficer.email,
      designation: comp.assignedOfficer.role || 'Officer'
    } : null,
    createdAt: comp.createdAt,
    updatedAt: comp.updatedAt,
    remarks: comp.remarks ? comp.remarks.map(r => ({
      id: r.id,
      adminName: r.admin ? (r.admin.fullName || r.admin.name) : 'Admin',
      remark: r.remark,
      createdAt: r.createdAt
    })) : [],
    statusHistory: comp.statusHistory ? comp.statusHistory.map(h => ({
      id: h.id,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      changedBy: h.changedBy ? (h.changedBy.fullName || h.changedBy.name) : 'System Admin',
      remark: h.remark,
      createdAt: h.createdAt
    })) : [],
    inquiries: comp.inquiries ? comp.inquiries.map(inq => ({
      id: inq.id,
      subject: inq.subject,
      status: inq.status,
      createdAt: inq.createdAt,
      updatedAt: inq.updatedAt,
      messages: inq.messages ? inq.messages.map(m => ({
        id: m.id,
        senderType: m.senderType,
        senderName: m.senderName,
        message: m.message,
        attachmentUrl: m.attachmentUrl,
        createdAt: m.createdAt,
      })) : []
    })) : []
  };
}

/** Helper to resolve or get a valid PostgreSQL User ID for foreign keys (changedById, adminId) */
async function resolveAdminUserId(adminUser) {
  if (!adminUser || !adminUser.id) return null;
  try {
    const user = await prisma.user.findUnique({ where: { id: adminUser.id } });
    if (user) return user.id;

    const email = adminUser.email || 'admin@wb.gov.in';
    const existingByEmail = await prisma.user.findUnique({ where: { email } });
    if (existingByEmail) return existingByEmail.id;

    const newAdmin = await prisma.user.create({
      data: {
        email,
        fullName: adminUser.name || adminUser.fullName || 'System Administrator',
        role: 'ADMIN',
      },
    });
    return newAdmin.id;
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/admin/complaints
 */
export async function getComplaints(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
    const search = req.query.search ? req.query.search.trim().toLowerCase() : '';
    const statusFilter = req.query.status ? req.query.status.trim().toUpperCase() : '';
    const categoryFilter = req.query.category ? req.query.category.trim().toUpperCase() : '';
    const priorityFilter = req.query.priority ? req.query.priority.trim().toUpperCase() : '';
    const dateFilter = req.query.date ? req.query.date.trim() : '';
    const escalatedFilter = req.query.escalated ? req.query.escalated.trim().toLowerCase() : '';

    let complaints = [];
    let total = 0;

    if (req.query.demo === '1') {
      const sampleResult = filterSampleComplaints({
        search,
        statusFilter,
        categoryFilter,
        priorityFilter,
        escalatedFilter,
        dateFilter,
        page,
        limit,
      });
      complaints = sampleResult.complaints.map(anonymizeComplaint);
      total = sampleResult.total;

      const sampleTotalPages = Math.ceil(total / limit) || 1;
      return res.status(200).json({
        complaints,
        pagination: {
          page,
          limit,
          total,
          totalPages: sampleTotalPages,
        },
      });
    }

    try {
      const whereClause = {};

      if (statusFilter && statusFilter !== 'ALL') {
        if (statusFilter === 'OPEN' || statusFilter === 'SUBMITTED') {
          whereClause.status = { in: ['OPEN', 'SUBMITTED'] };
        } else if (statusFilter === 'PENDING' || statusFilter === 'ACKNOWLEDGED') {
          whereClause.status = { in: ['OPEN', 'SUBMITTED', 'PENDING', 'ACKNOWLEDGED'] };
        } else if (statusFilter === 'ASSIGNED' || statusFilter === 'DEPARTMENT_ASSIGNED') {
          whereClause.status = { in: ['ASSIGNED', 'DEPARTMENT_ASSIGNED'] };
        } else if (statusFilter === 'IN_PROGRESS' || statusFilter === 'INVESTIGATION_IN_PROGRESS') {
          whereClause.status = { in: ['ASSIGNED', 'DEPARTMENT_ASSIGNED', 'IN_PROGRESS', 'INVESTIGATION_IN_PROGRESS', 'MORE_INFO_REQUIRED', 'REOPENED', 'ACTION_TAKEN'] };
        } else if (statusFilter === 'RESOLVED') {
          whereClause.status = { in: ['RESOLVED', 'CLOSED'] };
        } else {
          whereClause.status = statusFilter;
        }
      }

      if (escalatedFilter === 'true') {
        whereClause.isEscalated = true;
      } else if (escalatedFilter === 'false') {
        whereClause.isEscalated = false;
      }

      if (search) {
        whereClause.OR = [
          { ref: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (dateFilter) {
        const startDate = new Date(dateFilter);
        if (!isNaN(startDate.getTime())) {
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 1);
          whereClause.createdAt = {
            gte: startDate,
            lt: endDate,
          };
        }
      }

      const [dbComplaints, dbCount] = await Promise.all([
        prisma.complaint.findMany({
          where: whereClause,
          include: {
            assignedDepartment: true,
            assignedOfficer: true,
            evidence: { orderBy: { createdAt: 'desc' } },
            remarks: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
            statusHistory: { include: { changedBy: true }, orderBy: { createdAt: 'desc' } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.complaint.count({ where: whereClause }),
      ]);

      complaints = dbComplaints.map(formatComplaintRecord);
      total = dbCount;

      if (categoryFilter && categoryFilter !== 'ALL') {
        complaints = complaints.filter(c => c.category === categoryFilter);
      }
      if (priorityFilter && priorityFilter !== 'ALL') {
        complaints = complaints.filter(c => c.priority === priorityFilter);
      }
    } catch (dbError) {
      console.warn('⚠️ Database query warning (using fallback sample complaints):', dbError.message);

      const sampleResult = filterSampleComplaints({
        search,
        statusFilter,
        categoryFilter,
        priorityFilter,
        escalatedFilter,
        dateFilter,
        page,
        limit,
      });
      complaints = sampleResult.complaints.map(anonymizeComplaint);
      total = sampleResult.total;
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error in getComplaints:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve complaints list',
    });
  }
}

/**
 * GET /api/admin/complaints/:id
 */
export async function getComplaintById(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Complaint ID is required',
      });
    }

    let complaint = null;

    if (req.query.demo === '1') {
      const foundSample = SAMPLE_COMPLAINTS.find(c => c.id === id || c.ref.toLowerCase() === id.toLowerCase());
      if (foundSample) {
        complaint = anonymizeComplaint(foundSample);
      }

      if (!complaint) {
        return res.status(404).json({
          success: false,
          error: `Complaint with ID or Reference '${id}' was not found in demo data.`,
        });
      }

      return res.status(200).json({
        complaint,
      });
    }

    try {
      const dbComplaint = await prisma.complaint.findFirst({
        where: {
          OR: [
            { id: id },
            { ref: id },
            { ref: id.toUpperCase() },
          ],
        },
        include: {
          assignedDepartment: true,
          assignedOfficer: true,
          evidence: { orderBy: { createdAt: 'desc' } },
          remarks: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
          statusHistory: { include: { changedBy: true }, orderBy: { createdAt: 'desc' } },
          inquiries: {
            include: {
              messages: { orderBy: { createdAt: 'asc' } }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
      });

      if (dbComplaint) {
        complaint = formatComplaintRecord(dbComplaint);
      }
    } catch (dbError) {
      console.warn(`⚠️ Database query warning for complaint ${id}:`, dbError.message);
    }

    if (!complaint) {
      const foundSample = SAMPLE_COMPLAINTS.find(c => c.id === id || c.ref.toLowerCase() === id.toLowerCase());
      if (foundSample) {
        complaint = anonymizeComplaint(foundSample);
      }
    }

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: `Complaint with ID or Reference '${id}' was not found.`,
      });
    }

    return res.status(200).json({
      complaint,
    });
  } catch (error) {
    console.error(`Error in getComplaintById for ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve complaint details',
    });
  }
}

/**
 * PATCH /api/admin/complaints/:id/assignment
 */
export async function assignComplaint(req, res) {
  try {
    const { id } = req.params;
    const { departmentId, officerId } = req.body;
    const adminUser = req.user;
    const validAdminId = await resolveAdminUserId(adminUser);

    let updatedComplaint = null;

    try {
      const dbComplaint = await prisma.complaint.findFirst({
        where: { OR: [{ id }, { ref: id }, { ref: id.toUpperCase() }] },
      });

      if (dbComplaint) {
        const updateData = {};

        if (departmentId) {
          const dept = await prisma.department.findFirst({
            where: { OR: [{ id: departmentId }, { name: { contains: departmentId, mode: 'insensitive' } }] }
          });
          if (dept) updateData.assignedDepartmentId = dept.id;
        } else if (departmentId === null || departmentId === '') {
          updateData.assignedDepartmentId = null;
        }

        if (officerId) {
          let off = await prisma.user.findFirst({ where: { id: officerId } });
          if (!off) {
            const sampleOfficer = SAMPLE_OFFICERS.find(o => o.id === officerId || o.name.toLowerCase() === officerId.toLowerCase());
            if (sampleOfficer) {
              off = await prisma.user.findUnique({ where: { email: sampleOfficer.email } });
              if (!off) {
                off = await prisma.user.create({
                  data: {
                    email: sampleOfficer.email,
                    fullName: sampleOfficer.name,
                    role: 'OFFICER',
                  }
                });
              }
            }
          }
          if (off) updateData.assignedOfficerId = off.id;
        } else if (officerId === null || officerId === '') {
          updateData.assignedOfficerId = null;
        }

        let newStatus = dbComplaint.status;
        if (departmentId || officerId) {
          newStatus = 'DEPARTMENT_ASSIGNED';
          updateData.status = 'DEPARTMENT_ASSIGNED';
        }

        const [resComplaint] = await prisma.$transaction([
          prisma.complaint.update({
            where: { id: dbComplaint.id },
            data: updateData,
            include: {
              assignedDepartment: true,
              assignedOfficer: true,
              evidence: { orderBy: { createdAt: 'desc' } },
              remarks: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
              statusHistory: { include: { changedBy: true }, orderBy: { createdAt: 'desc' } },
              inquiries: {
                include: {
                  messages: { orderBy: { createdAt: 'asc' } }
                },
                orderBy: { createdAt: 'desc' }
              }
            },
          }),
          ...(newStatus !== dbComplaint.status ? [
            prisma.complaintStatusHistory.create({
              data: {
                complaintId: dbComplaint.id,
                previousStatus: dbComplaint.status,
                newStatus: newStatus,
                changedById: validAdminId,
                remark: 'Complaint assigned to department / officer.',
              },
            })
          ] : [])
        ]);

        updatedComplaint = formatComplaintRecord(resComplaint);
      }
    } catch (dbError) {
      console.warn(`⚠️ Database query warning during assignment for ${id}:`, dbError.message);
    }

    if (!updatedComplaint) {
      const sample = SAMPLE_COMPLAINTS.find(c => c.id === id || c.ref.toLowerCase() === id.toLowerCase());
      if (!sample) {
        return res.status(404).json({
          success: false,
          error: `Complaint '${id}' not found`,
        });
      }

      if (departmentId) {
        const dept = SAMPLE_DEPARTMENTS.find(d => d.id === departmentId);
        if (dept) sample.assignedDepartment = dept;
      }
      if (officerId) {
        const off = SAMPLE_OFFICERS.find(o => o.id === officerId);
        if (off) sample.assignedOfficer = off;
      }

      const prevStatus = sample.status;
      if (departmentId || officerId) {
        sample.status = 'DEPARTMENT_ASSIGNED';
      }

      sample.updatedAt = new Date().toISOString();

      if (prevStatus !== sample.status) {
        sample.statusHistory.unshift({
          id: `h-${Date.now()}`,
          previousStatus: prevStatus,
          newStatus: sample.status,
          changedBy: adminUser.name || 'System Administrator',
          remark: 'Complaint assigned to department / officer.',
          createdAt: new Date().toISOString()
        });
      }

      updatedComplaint = anonymizeComplaint(sample);
    }

    return res.status(200).json({
      success: true,
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error('Error in assignComplaint:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to assign complaint',
    });
  }
}

/**
 * PATCH /api/admin/complaints/:id/status
 */
export async function updateComplaintStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;
    const adminUser = req.user;
    const validAdminId = await resolveAdminUserId(adminUser);

    const VALID_STATUSES = [
      'SUBMITTED',
      'ACKNOWLEDGED',
      'DEPARTMENT_ASSIGNED',
      'INVESTIGATION_IN_PROGRESS',
      'ACTION_TAKEN',
      'RESOLVED',
      'CLOSED',
      'REOPENED',
      'MORE_INFO_REQUIRED',
      'ESCALATED',
      'OPEN',
      'PENDING',
      'ASSIGNED',
      'IN_PROGRESS'
    ];
    if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Allowed statuses: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const newStatusUpper = status.toUpperCase();
    let updatedComplaint = null;

    try {
      const dbComplaint = await prisma.complaint.findFirst({
        where: { OR: [{ id }, { ref: id }, { ref: id.toUpperCase() }] },
      });

      if (dbComplaint) {
        const previousStatus = dbComplaint.status;

        const [resComplaint] = await prisma.$transaction([
          prisma.complaint.update({
            where: { id: dbComplaint.id },
            data: { status: newStatusUpper },
            include: {
              assignedDepartment: true,
              assignedOfficer: true,
              evidence: { orderBy: { createdAt: 'desc' } },
              remarks: { include: { admin: true }, orderBy: { createdAt: 'desc' } },
              statusHistory: { include: { changedBy: true }, orderBy: { createdAt: 'desc' } }
            },
          }),
          prisma.complaintStatusHistory.create({
            data: {
              complaintId: dbComplaint.id,
              previousStatus: previousStatus,
              newStatus: newStatusUpper,
              changedById: validAdminId,
              remark: remark || `Status changed from ${previousStatus} to ${newStatusUpper}`,
            },
          }),
        ]);

        updatedComplaint = formatComplaintRecord(resComplaint);
      }
    } catch (dbError) {
      console.warn(`⚠️ Database query warning during status update for ${id}:`, dbError.message);
    }

    if (!updatedComplaint) {
      const sample = SAMPLE_COMPLAINTS.find(c => c.id === id || c.ref.toLowerCase() === id.toLowerCase());
      if (!sample) {
        return res.status(404).json({
          success: false,
          error: `Complaint '${id}' not found`,
        });
      }

      const previousStatus = sample.status;
      sample.status = newStatusUpper;
      sample.updatedAt = new Date().toISOString();

      const newHistoryItem = {
        id: `h-${Date.now()}`,
        previousStatus: previousStatus,
        newStatus: newStatusUpper,
        changedBy: adminUser.name || 'System Administrator',
        remark: remark || `Status changed from ${previousStatus} to ${newStatusUpper}`,
        createdAt: new Date().toISOString(),
      };

      sample.statusHistory.unshift(newHistoryItem);
      updatedComplaint = anonymizeComplaint(sample);
    }

    return res.status(200).json({
      success: true,
      complaint: updatedComplaint,
    });
  } catch (error) {
    console.error('Error in updateComplaintStatus:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update complaint status',
    });
  }
}

/**
 * POST /api/admin/complaints/:id/remarks
 */
export async function addComplaintRemark(req, res) {
  try {
    const { id } = req.params;
    const { remark } = req.body;
    const adminUser = req.user;
    const validAdminId = await resolveAdminUserId(adminUser);

    if (!remark || !remark.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Remark text cannot be empty',
      });
    }

    const trimmedRemark = remark.trim();
    let newRemarkObj = null;

    try {
      const dbComplaint = await prisma.complaint.findFirst({
        where: { OR: [{ id }, { ref: id }, { ref: id.toUpperCase() }] },
      });

      if (dbComplaint) {
        const createdRemark = await prisma.complaintRemark.create({
          data: {
            complaintId: dbComplaint.id,
            adminId: validAdminId,
            remark: trimmedRemark,
          },
          include: { admin: true },
        });

        newRemarkObj = {
          id: createdRemark.id,
          adminName: createdRemark.admin ? (createdRemark.admin.fullName || createdRemark.admin.name) : (adminUser.name || 'Admin'),
          remark: createdRemark.remark,
          createdAt: createdRemark.createdAt,
        };
      }
    } catch (dbError) {
      console.warn(`⚠️ Database query warning adding remark to ${id}:`, dbError.message);
    }

    if (!newRemarkObj) {
      const sample = SAMPLE_COMPLAINTS.find(c => c.id === id || c.ref.toLowerCase() === id.toLowerCase());
      if (!sample) {
        return res.status(404).json({
          success: false,
          error: `Complaint '${id}' not found`,
        });
      }

      newRemarkObj = {
        id: `r-${Date.now()}`,
        adminName: adminUser.name || 'System Administrator',
        remark: trimmedRemark,
        createdAt: new Date().toISOString(),
      };

      sample.remarks.unshift(newRemarkObj);
    }

    return res.status(201).json({
      success: true,
      remark: newRemarkObj,
    });
  } catch (error) {
    console.error('Error in addComplaintRemark:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add complaint remark',
    });
  }
}

/**
 * POST /api/admin/escalations/check
 * Protected manual trigger for overdue complaint escalation check
 */
export async function triggerManualEscalationCheck(req, res) {
  try {
    const summary = await checkOverdueComplaints();
    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Error in triggerManualEscalationCheck:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute overdue escalation check',
    });
  }
}

/**
 * GET /api/admin/workflow/meta
 */
export async function getWorkflowMeta(req, res) {
  try {
    let departments = [];
    let officers = [];

    if (req.query.demo === '1') {
      return res.status(200).json({
        departments: SAMPLE_DEPARTMENTS,
        officers: SAMPLE_OFFICERS,
        escalationThresholdDays: getEscalationDays(),
      });
    }

    try {
      const [dbDepts, dbOfficers] = await Promise.all([
        prisma.department.findMany({ orderBy: { name: 'asc' } }),
        prisma.user.findMany({
          where: { role: 'OFFICER' },
          select: { id: true, fullName: true, email: true, role: true },
          orderBy: { fullName: 'asc' },
        }),
      ]);

      departments = dbDepts.length > 0 ? dbDepts : SAMPLE_DEPARTMENTS;
      officers = dbOfficers.length > 0
        ? dbOfficers.map(o => ({ id: o.id, name: o.fullName, email: o.email, designation: 'Officer' }))
        : SAMPLE_OFFICERS;
    } catch (dbError) {
      departments = SAMPLE_DEPARTMENTS;
      officers = SAMPLE_OFFICERS;
    }

    return res.status(200).json({
      departments,
      officers,
      escalationThresholdDays: getEscalationDays(),
    });
  } catch (error) {
    console.error('Error in getWorkflowMeta:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load workflow metadata',
    });
  }
}

/**
 * POST /api/admin/complaints/:id/inquiries
 * Allows admin/officer to ask citizen for additional information or documents.
 */
export async function createAdminInquiry(req, res) {
  try {
    const { id } = req.params;
    const { subject, question } = req.body;
    const adminUser = req.user;
    const validAdminId = await resolveAdminUserId(adminUser);

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Question text is required',
      });
    }

    const qText = question.trim();
    const subj = subject ? subject.trim() : 'Additional Information Required';

    const dbComplaint = await prisma.complaint.findFirst({
      where: { OR: [{ id }, { ref: id }, { ref: id.toUpperCase() }] },
    });

    if (!dbComplaint) {
      return res.status(404).json({ success: false, error: 'Complaint not found' });
    }

    const previousStatus = dbComplaint.status;
    const newStatus = 'MORE_INFO_REQUIRED';

    const [inquiry] = await prisma.$transaction([
      prisma.complaintInquiry.create({
        data: {
          complaintId: dbComplaint.id,
          subject: subj,
          status: 'OPEN',
          messages: {
            create: [
              {
                senderType: 'ADMIN',
                senderName: adminUser.fullName || adminUser.name || 'Department Officer',
                message: qText,
              },
            ],
          },
        },
        include: { messages: true },
      }),
      prisma.notification.create({
        data: {
          complaintId: dbComplaint.id,
          targetType: 'CITIZEN',
          type: 'INQUIRY_REQUESTED',
          title: 'New Message from Department',
          message: `Department: ${qText}`,
        },
      }),
    ]);

    return res.status(201).json({
      success: true,
      inquiry,
      message: 'Inquiry posted to citizen successfully',
    });
  } catch (error) {
    console.error('Error in createAdminInquiry:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create admin inquiry',
    });
  }
}
