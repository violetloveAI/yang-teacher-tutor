'use client';
/* eslint-disable @next/next/no-img-element -- local compressed lesson attachments use data URLs */

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  ArrowLeft, BarChart3, BellRing, BookOpen, CalendarDays, Camera, Check,
  CalendarRange, ChevronLeft, ChevronRight, CircleDollarSign, Clock3, GraduationCap,
  Database, Download, ExternalLink, FileKey2, Filter, Fingerprint, Info, ListTodo,
  LockKeyhole, LockOpen, MapPin, Maximize2, Moon, Navigation, Palette, Phone, Plus,
  Repeat2, Search, Settings2, ShieldCheck, Smartphone, Sun, Trash2, Upload, Users, X,
} from 'lucide-react';
import { decryptBackup, encryptBackup, type EncryptedBackup } from './backup';
import { authenticateAppLock, saveAndShareBackup, syncLocalNotifications } from './native';
import { callPhone, openAppleMaps } from './platform';

type Subject = '语文' | '数学' | '英语';
type LessonStatus = '已预约' | '已完成' | '已取消';
type Mastery = '已掌握' | '需要巩固' | '未掌握';
type Payment = '已收款' | '待收款';
type Tab = 'calendar' | 'students' | 'stats' | 'settings';
type StatUnit = '日' | '周' | '月' | '季' | '年';
type CalendarMode = 'month' | 'week';
type ScheduleMode = 'single' | 'weekly';
type ScheduleEntryKind = 'todo' | 'reminder';
type TutoringStatus = 'active' | 'ended';
type StudentStatusFilter = 'all' | TutoringStatus;
type ContributionMetric = 'income' | 'hours' | 'lessons';
type StatPeriod = { key: string; label: string; detail: string; start: string; end: string; current: boolean };

type AppSettings = {
  faceIdEnabled: boolean;
  autoLockMinutes: number;
  lessonReminderMinutes: number;
  departureBufferMinutes: number;
  notificationsEnabled: boolean;
};

type AppData = {
  version: 1;
  students: Student[];
  lessons: Lesson[];
  scheduleEntries: ScheduleEntry[];
  settings: AppSettings;
};

type Student = {
  id: string; name: string; nickname: string; grade: string; school: string;
  parentName: string; parentPhone: string; subjects: Subject[];
  defaultDuration: number; defaultFee: number; notes: string;
  locationShort?: string; fullAddress?: string; commuteMinutes?: number; color?: string;
  defaultHourlyRate?: number; commuteCost?: number; preparationMinutes?: number; wrapUpMinutes?: number;
  defaultStartTime?: string; defaultEndTime?: string; defaultWeekdays?: number[]; autoScheduleEnabled?: boolean;
  teacherEvaluation?: string; parentEvaluation?: string; archiveNotes?: string;
  tutoringStatus?: TutoringStatus; tutoringStartDate?: string; tutoringEndDate?: string;
};

type Lesson = {
  id: string; studentId: string; date: string; startTime: string; endTime: string;
  duration: number; subject: Subject; status: LessonStatus; teachingContent: string;
  mastery: Mastery; masteryNotes: string; performance: string; homework: string;
  nextPlan: string; privateNotes: string; fee: number; payment: Payment; photos: string[];
  masteredWhat?: string; needsPracticeWhat?: string; notMasteredWhat?: string;
  commuteMinutes?: number; commuteCost?: number; preparationMinutes?: number; wrapUpMinutes?: number;
  scheduleMode?: ScheduleMode; repeatStart?: string; repeatEnd?: string;
  repeatWeekdays?: number[]; seriesId?: string;
};

type ScheduleEntry = {
  id: string; kind: ScheduleEntryKind; title: string; date: string;
  startTime: string; endTime: string; duration: number; notes: string;
  completed: boolean; scheduleMode?: ScheduleMode; repeatStart?: string;
  repeatEnd?: string; repeatWeekdays?: number[]; seriesId?: string;
};

const studentColorPalette = ['#7b6ba8', '#5f7f65', '#b16f4f', '#397c8f', '#a05c75', '#8a713e', '#526fa3', '#7b715f'];

const initialStudents: Student[] = [
  { id: 'mia', name: '林知夏', nickname: 'Mia', grade: '五年级', school: '启明小学', parentName: '林女士', parentPhone: '演示号码', subjects: ['数学', '英语'], defaultDuration: 90, defaultFee: 300, defaultHourlyRate: 200, defaultStartTime: '16:00', defaultEndTime: '17:30', defaultWeekdays: [3, 6], autoScheduleEnabled: true, preparationMinutes: 20, wrapUpMinutes: 10, commuteCost: 12, notes: '应用题读题时容易漏条件。', locationShort: '徐家汇', fullAddress: '演示地址：徐汇区某小区', commuteMinutes: 35, color: studentColorPalette[0], teacherEvaluation: '理解速度快，遇到综合题容易急，需要练习把条件逐条圈出。', parentEvaluation: '沟通及时，比较关注学习方法。', archiveNotes: '阶段目标：开学前把分数应用题正确率稳定到 85%。', tutoringStatus: 'active', tutoringStartDate: '2026-07-01', tutoringEndDate: '' },
  { id: 'leo', name: '周予安', nickname: 'Leo', grade: '四年级', school: '实验小学', parentName: '周先生', parentPhone: '演示号码', subjects: ['语文', '英语'], defaultDuration: 60, defaultFee: 220, defaultHourlyRate: 220, defaultStartTime: '19:00', defaultEndTime: '20:00', defaultWeekdays: [2], autoScheduleEnabled: true, preparationMinutes: 15, wrapUpMinutes: 10, commuteCost: 18, notes: '口语表达积极，书写需要更细心。', locationShort: '浦东', fullAddress: '演示地址：浦东新区某小区', commuteMinutes: 50, color: studentColorPalette[1], teacherEvaluation: '口语参与度高，单词拼写需要建立错词本。', parentEvaluation: '更偏结果导向，需要每两周同步一次进展。', archiveNotes: '适合短任务、快反馈的课堂节奏。', tutoringStatus: 'active', tutoringStartDate: '2026-06-01', tutoringEndDate: '' },
  { id: 'emma', name: '陈嘉禾', nickname: 'Emma', grade: '六年级', school: '文澜小学', parentName: '陈女士', parentPhone: '演示号码', subjects: ['语文', '数学'], defaultDuration: 90, defaultFee: 280, defaultHourlyRate: 187, defaultStartTime: '18:30', defaultEndTime: '20:00', defaultWeekdays: [5], autoScheduleEnabled: false, preparationMinutes: 25, wrapUpMinutes: 10, commuteCost: 16, notes: '小升初阶段课程已完成，保留历史记录。', locationShort: '杨浦', fullAddress: '演示地址：杨浦区某小区', commuteMinutes: 42, color: studentColorPalette[2], teacherEvaluation: '思路完整，表达有条理，作文素材积累不足。', parentEvaluation: '配合度高，会主动确认作业完成情况。', archiveNotes: '阶段课程已经完成，可在新学期按需重新开启。', tutoringStatus: 'ended', tutoringStartDate: '2026-05-15', tutoringEndDate: '2026-08-23' },
  { id: 'nora', name: '沈星遥', nickname: 'Nora', grade: '三年级', school: '汇师小学', parentName: '沈女士', parentPhone: '演示号码', subjects: ['语文', '英语'], defaultDuration: 60, defaultFee: 240, defaultHourlyRate: 240, defaultStartTime: '17:00', defaultEndTime: '18:00', defaultWeekdays: [4], autoScheduleEnabled: true, preparationMinutes: 20, wrapUpMinutes: 10, commuteCost: 8, notes: '阅读兴趣浓，朗读很有表现力。', locationShort: '静安寺', fullAddress: '演示地址：静安区某小区', commuteMinutes: 28, color: studentColorPalette[3], teacherEvaluation: '表达欲强，注意把答案写完整。', parentEvaluation: '沟通细致，时间安排稳定。', archiveNotes: '可多安排故事复述与看图写话。', tutoringStatus: 'active', tutoringStartDate: '2026-08-01', tutoringEndDate: '2026-10-31' },
  { id: 'felix', name: '顾明川', nickname: 'Felix', grade: '初一', school: '市西初级中学', parentName: '顾先生', parentPhone: '演示号码', subjects: ['数学', '英语'], defaultDuration: 120, defaultFee: 420, defaultHourlyRate: 210, defaultStartTime: '18:30', defaultEndTime: '20:30', defaultWeekdays: [1, 5], autoScheduleEnabled: true, preparationMinutes: 30, wrapUpMinutes: 15, commuteCost: 10, notes: '基础不错，需要适应初中题量。', locationShort: '中山公园', fullAddress: '演示地址：长宁区某小区', commuteMinutes: 32, color: studentColorPalette[4], teacherEvaluation: '推理能力好，但步骤书写过于跳跃。', parentEvaluation: '尊重课堂节奏，希望每月收到一次复盘。', archiveNotes: '开学第一个月重点观察作业量和适应情况。', tutoringStatus: 'active', tutoringStartDate: '2026-07-20', tutoringEndDate: '' },
  { id: 'yoyo', name: '唐语桐', nickname: 'Yoyo', grade: '二年级', school: '明珠小学', parentName: '唐女士', parentPhone: '演示号码', subjects: ['语文', '数学'], defaultDuration: 60, defaultFee: 200, defaultHourlyRate: 200, defaultStartTime: '10:00', defaultEndTime: '11:00', defaultWeekdays: [7], autoScheduleEnabled: true, preparationMinutes: 20, wrapUpMinutes: 10, commuteCost: 20, notes: '低年级，以兴趣和习惯培养为主。', locationShort: '世纪公园', fullAddress: '演示地址：浦东新区某小区', commuteMinutes: 46, color: studentColorPalette[5], teacherEvaluation: '专注约 25 分钟，适合穿插卡片游戏。', parentEvaluation: '配合准备教具，反馈温和。', archiveNotes: '避免一次布置过多书面作业。', tutoringStatus: 'active', tutoringStartDate: '2026-07-15', tutoringEndDate: '' },
];

function demoLesson(id: string, studentId: string, date: string, startTime: string, endTime: string, subject: Subject, teachingContent: string, fee: number, options: Partial<Lesson> = {}): Lesson {
  const duration = durationFromTimes(startTime, endTime, 60);
  return {
    id, studentId, date, startTime, endTime, duration, subject,
    status: '已完成', teachingContent, mastery: '需要巩固', masteryNotes: '',
    performance: '课堂投入稳定，能跟随引导完成练习。', homework: '完成本次配套练习并标记疑问。',
    nextPlan: '先检查作业，再进入下一知识点。', privateNotes: '', fee, payment: '已收款', photos: [],
    masteredWhat: '基础概念与例题方法已经能够独立复述。', needsPracticeWhat: '综合题中需要继续练习审题和步骤表达。', notMasteredWhat: '',
    ...options,
  };
}

const initialLessons: Lesson[] = [
  { id: 'l1', studentId: 'mia', date: '2026-08-26', startTime: '16:00', endTime: '17:30', duration: 90, subject: '数学', status: '已完成', teachingContent: '分数应用题与错题订正', mastery: '需要巩固', masteryNotes: '基本方法已理解，复杂条件仍会漏读。', performance: '前半节专注，订正时能主动复盘。', homework: '练习册 P42，第 3–8 题', nextPlan: '继续练习分数应用题，复习约分。', privateNotes: '', fee: 300, payment: '已收款', photos: [] },
  { id: 'l2', studentId: 'leo', date: '2026-08-26', startTime: '19:00', endTime: '20:00', duration: 60, subject: '英语', status: '已预约', teachingContent: '一般过去时', mastery: '需要巩固', masteryNotes: '', performance: '', homework: '', nextPlan: '', privateNotes: '', fee: 220, payment: '待收款', photos: [] },
  { id: 'l3', studentId: 'mia', date: '2026-08-21', startTime: '16:00', endTime: '17:30', duration: 90, subject: '数学', status: '已完成', teachingContent: '分数乘法与约分', mastery: '已掌握', masteryNotes: '计算准确率明显提高。', performance: '状态很好。', homework: '口算两页', nextPlan: '进入分数应用题。', privateNotes: '', fee: 300, payment: '已收款', photos: [] },
  { id: 'l4', studentId: 'emma', date: '2026-08-18', startTime: '18:30', endTime: '20:00', duration: 90, subject: '语文', status: '已完成', teachingContent: '记叙文阅读：人物描写', mastery: '已掌握', masteryNotes: '能准确识别动作与心理描写。', performance: '表达清楚。', homework: '完成一篇人物小传', nextPlan: '讲解作文结构。', privateNotes: '', fee: 280, payment: '待收款', photos: [] },
  { id: 'l5', studentId: 'leo', date: '2026-08-12', startTime: '19:00', endTime: '20:00', duration: 60, subject: '英语', status: '已完成', teachingContent: '动词过去式变化', mastery: '未掌握', masteryNotes: '不规则变化记忆不牢。', performance: '后半段略疲劳。', homework: '背诵不规则动词表 1–20', nextPlan: '听写并进入句型练习。', privateNotes: '', fee: 220, payment: '已收款', photos: [] },
  { id: 'l6', studentId: 'emma', date: '2026-08-08', startTime: '14:00', endTime: '15:30', duration: 90, subject: '数学', status: '已完成', teachingContent: '圆柱体积综合题', mastery: '需要巩固', masteryNotes: '单位换算仍会出错。', performance: '愿意主动讲思路。', homework: '综合卷第 2 面', nextPlan: '集中复习单位换算。', privateNotes: '', fee: 280, payment: '已收款', photos: [] },
  { id: 'l7', studentId: 'mia', date: '2026-07-29', startTime: '16:00', endTime: '17:30', duration: 90, subject: '英语', status: '已完成', teachingContent: '一般过去时', mastery: '未掌握', masteryNotes: 'be 动词变化容易混淆。', performance: '需要更多口头练习。', homework: '完成时态对比练习', nextPlan: '复习 was / were。', privateNotes: '', fee: 280, payment: '已收款', photos: [] },
  { id: 'l8', studentId: 'mia', date: '2026-07-22', startTime: '16:00', endTime: '17:30', duration: 90, subject: '数学', status: '已完成', teachingContent: '小数除法复习', mastery: '已掌握', masteryNotes: '', performance: '稳定。', homework: '', nextPlan: '分数乘法。', privateNotes: '', fee: 280, payment: '已收款', photos: [] },
  demoLesson('l9', 'nora', '2026-08-25', '17:00', '18:00', '语文', '看图写话：人物动作', 240, { payment: '待收款', masteredWhat: '能够按时间顺序描述画面。', needsPracticeWhat: '增加动作与表情细节。' }),
  demoLesson('l10', 'felix', '2026-08-24', '18:30', '20:30', '数学', '有理数与数轴综合', 420, { masteredWhat: '正负数比较和数轴定位。', needsPracticeWhat: '分类讨论时避免漏情况。' }),
  demoLesson('l11', 'yoyo', '2026-08-26', '09:30', '10:30', '语文', '绘本阅读与句子仿写', 200, { mastery: '已掌握', needsPracticeWhat: '', masteredWhat: '能够用“先……再……”完整表达。' }),
  demoLesson('l12', 'emma', '2026-08-23', '14:00', '15:30', '数学', '百分数应用题', 280, { payment: '待收款' }),
  demoLesson('l13', 'nora', '2026-08-20', '17:00', '18:00', '英语', '自然拼读：长元音', 240, { mastery: '已掌握', needsPracticeWhat: '', masteredWhat: 'a_e 与 i_e 发音规则。' }),
  demoLesson('l14', 'felix', '2026-08-19', '18:30', '20:30', '英语', '一般现在时与频率副词', 420, { payment: '待收款', notMasteredWhat: '第三人称单数的否定句仍会混淆。' }),
  demoLesson('l15', 'yoyo', '2026-08-17', '10:00', '11:00', '数学', '百以内加减法', 200, { mastery: '已掌握', needsPracticeWhat: '', masteredWhat: '进退位计算准确率达到 90%。' }),
  demoLesson('l16', 'mia', '2026-08-15', '16:00', '17:30', '英语', '过去时态口语练习', 300),
  demoLesson('l17', 'nora', '2026-08-13', '17:00', '18:00', '语文', '阅读理解：提取信息', 240),
  demoLesson('l18', 'felix', '2026-08-10', '18:30', '20:30', '数学', '整式与代数式入门', 420, { mastery: '已掌握', needsPracticeWhat: '', masteredWhat: '能够区分单项式与多项式。' }),
  demoLesson('l19', 'yoyo', '2026-08-09', '10:00', '11:00', '语文', '拼音复习与朗读', 200),
  demoLesson('l20', 'mia', '2026-08-06', '16:00', '17:30', '数学', '分数乘法基础', 300),
  demoLesson('l21', 'emma', '2026-08-05', '18:30', '20:00', '语文', '作文结构：总分总', 280, { payment: '待收款' }),
  demoLesson('l22', 'leo', '2026-08-04', '19:00', '20:00', '英语', '过去式听写与句型', 220),
  demoLesson('l23', 'nora', '2026-08-03', '17:00', '18:00', '英语', '自我介绍与课堂口语', 240),
  demoLesson('l24', 'felix', '2026-07-27', '18:30', '20:30', '数学', '小升初衔接诊断', 420),
  demoLesson('l25', 'yoyo', '2026-07-25', '10:00', '11:00', '数学', '计算习惯评估', 200),
  demoLesson('l26', 'emma', '2026-06-28', '14:00', '15:30', '语文', '期末阅读专题', 280),
  demoLesson('l27', 'leo', '2026-06-20', '19:00', '20:00', '英语', '期末语法复习', 220),
];

const initialScheduleEntries: ScheduleEntry[] = [
  { id: 's1', kind: 'reminder', title: '出发去徐家汇', date: '2026-08-26', startTime: '15:10', endTime: '15:25', duration: 15, notes: '地铁预计 35 分钟，预留进小区时间。', completed: true },
  { id: 's2', kind: 'todo', title: '整理 Leo 错词卡', date: '2026-08-26', startTime: '13:30', endTime: '14:00', duration: 30, notes: '打印过去式词卡 1–20。', completed: false },
  { id: 's3', kind: 'reminder', title: '确认周末调课', date: '2026-08-27', startTime: '12:30', endTime: '12:45', duration: 15, notes: '分别和 Emma、Nora 家长确认。', completed: false },
  { id: 's4', kind: 'todo', title: '月度收款核对', date: '2026-08-28', startTime: '10:00', endTime: '10:45', duration: 45, notes: '核对待收款课程并发出温和提醒。', completed: false },
  { id: 's5', kind: 'reminder', title: '打印 Felix 诊断卷', date: '2026-08-24', startTime: '16:30', endTime: '16:45', duration: 15, notes: 'A4 双面，附答案页。', completed: true },
  { id: 's6', kind: 'todo', title: '更新学生阶段评价', date: '2026-08-30', startTime: '20:30', endTime: '21:00', duration: 30, notes: '只写入已上锁的私人档案。', completed: false },
];

const weekDays = ['一', '二', '三', '四', '五', '六', '日'];
const subjects: Subject[] = ['语文', '数学', '英语'];
const statusOptions: LessonStatus[] = ['已预约', '已完成', '已取消'];
const statUnits: StatUnit[] = ['日', '周', '月', '季', '年'];
const cnMoney = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 });
const IS_DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== 'false';
const STORAGE_KEY = 'yang-teacher-tutor-data-v1';
const THEME_KEY = 'yang-teacher-tutor-theme';
const ARCHIVE_PIN_KEY = 'yang-teacher-tutor-archive-pin';
const currentLocalDate = localDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
const demoToday = IS_DEMO_MODE ? '2026-08-26' : currentLocalDate;
const defaultSettings: AppSettings = {
  faceIdEnabled: false,
  autoLockMinutes: 5,
  lessonReminderMinutes: 60,
  departureBufferMinutes: 15,
  notificationsEnabled: true,
};

function tutoringStatusFor(student?: Student): TutoringStatus {
  if (!student) return 'active';
  if (student.tutoringStatus === 'ended') return 'ended';
  if (student.tutoringEndDate && student.tutoringEndDate < demoToday) return 'ended';
  return 'active';
}

function studentCanAttendOn(student: Student | undefined, date: string) {
  if (!student) return true;
  if (student.tutoringStartDate && date < student.tutoringStartDate) return false;
  if (student.tutoringEndDate && date > student.tutoringEndDate) return false;
  if (student.tutoringStatus === 'ended' && !student.tutoringEndDate && date > demoToday) return false;
  return true;
}

function tutoringStatusLabel(student?: Student) {
  return tutoringStatusFor(student) === 'active' ? '正在授课' : '已结课';
}

function lessonCostBreakdown(lesson: Lesson, student?: Student) {
  const commuteMinutes = Math.max(0, lesson.commuteMinutes ?? student?.commuteMinutes ?? 0);
  const commuteCost = Math.max(0, lesson.commuteCost ?? student?.commuteCost ?? 0);
  const preparationMinutes = Math.max(0, lesson.preparationMinutes ?? student?.preparationMinutes ?? 0);
  const wrapUpMinutes = Math.max(0, lesson.wrapUpMinutes ?? student?.wrapUpMinutes ?? 0);
  const workMinutes = Math.max(0, lesson.duration) + commuteMinutes * 2 + preparationMinutes + wrapUpMinutes;
  const netIncome = lesson.fee - commuteCost;
  return {
    commuteMinutes,
    commuteCost,
    preparationMinutes,
    wrapUpMinutes,
    workMinutes,
    netIncome,
    effectiveHourly: workMinutes ? netIncome / (workMinutes / 60) : 0,
  };
}

function studentHourlyRate(student: Student) {
  if (Number.isFinite(student.defaultHourlyRate) && Number(student.defaultHourlyRate) >= 0) return Number(student.defaultHourlyRate);
  return student.defaultDuration ? student.defaultFee / (student.defaultDuration / 60) : 0;
}

function calculateLessonStats(items: Lesson[], students: Record<string, Student> = {}) {
  const receivable = items.reduce((sum, item) => sum + item.fee, 0);
  const paid = items.filter((item) => item.payment === '已收款').reduce((sum, item) => sum + item.fee, 0);
  const minutes = items.reduce((sum, item) => sum + item.duration, 0);
  const costs = items.map((item) => lessonCostBreakdown(item, students[item.studentId]));
  const commuteCost = costs.reduce((sum, item) => sum + item.commuteCost, 0);
  const workMinutes = costs.reduce((sum, item) => sum + item.workMinutes, 0);
  const commuteTime = costs.reduce((sum, item) => sum + item.commuteMinutes * 2, 0);
  const preparationTime = costs.reduce((sum, item) => sum + item.preparationMinutes, 0);
  const wrapUpTime = costs.reduce((sum, item) => sum + item.wrapUpMinutes, 0);
  const netIncome = receivable - commuteCost;
  return {
    receivable,
    paid,
    unpaid: receivable - paid,
    hours: minutes / 60,
    count: items.length,
    hourly: minutes ? receivable / (minutes / 60) : 0,
    commuteCost,
    netIncome,
    workHours: workMinutes / 60,
    effectiveHourly: workMinutes ? netIncome / (workMinutes / 60) : 0,
    commuteTime,
    preparationTime,
    wrapUpTime,
  };
}

function buildStatPeriods(unit: StatUnit): StatPeriod[] {
  const today = new Date(`${demoToday}T12:00:00`);
  const containsToday = (start: string, end: string) => demoToday >= start && demoToday <= end;

  if (unit === '日') {
    return Array.from({ length: 181 }, (_, index) => {
      const date = dateFrom(today, index - 90);
      const [, month, day] = date.split('-').map(Number);
      return { key: date, label: `${month}/${day}`, detail: `${date.slice(0, 4)}年${month}月${day}日`, start: date, end: date, current: date === demoToday };
    });
  }

  if (unit === '周') {
    const currentStart = weekStartFor(demoToday);
    return Array.from({ length: 33 }, (_, index) => {
      const start = dateFrom(currentStart, (index - 16) * 7);
      const end = dateFrom(new Date(`${start}T12:00:00`), 6);
      const [, startMonth, startDay] = start.split('-').map(Number);
      const [, endMonth, endDay] = end.split('-').map(Number);
      return { key: start, label: `${startMonth}/${startDay}–${endMonth}/${endDay}`, detail: `${start.slice(0, 4)}年${startMonth}月${startDay}日–${endMonth}月${endDay}日`, start, end, current: containsToday(start, end) };
    });
  }

  if (unit === '月') {
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return Array.from({ length: 37 }, (_, index) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + index - 18, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const start = localDate(year, month, 1);
      const end = localDate(year, month + 1, 0);
      return { key: start, label: `${year}/${String(month + 1).padStart(2, '0')}`, detail: `${year}年${month + 1}月`, start, end, current: containsToday(start, end) };
    });
  }

  if (unit === '季') {
    const currentQuarterStart = Math.floor(today.getMonth() / 3) * 3;
    return Array.from({ length: 25 }, (_, index) => {
      const date = new Date(today.getFullYear(), currentQuarterStart + (index - 12) * 3, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const quarter = Math.floor(month / 3) + 1;
      const start = localDate(year, month, 1);
      const end = localDate(year, month + 3, 0);
      return { key: start, label: `${year} Q${quarter}`, detail: `${year}年第${quarter}季度`, start, end, current: containsToday(start, end) };
    });
  }

  return Array.from({ length: 17 }, (_, index) => {
    const year = today.getFullYear() + index - 8;
    const start = localDate(year, 0, 1);
    const end = localDate(year, 11, 31);
    return { key: start, label: `${year}年`, detail: `${year}年`, start, end, current: containsToday(start, end) };
  });
}

function studentColor(student?: Student) {
  return student?.color || '#6d7f6a';
}

function contrastText(hex: string) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized;
  const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  const luminance = [red, green, blue].map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

function colorWash(hex: string, alpha = 0.2) {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized;
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
}

function avatarStyle(student?: Student): React.CSSProperties {
  const color = studentColor(student);
  return { backgroundColor: color, color: contrastText(color) };
}

function localDate(year: number, month: number, day: number) {
  const date = new Date(year, month, day);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatShortDate(value: string) {
  const [, month, day] = value.split('-');
  return `${Number(month)}月${Number(day)}日`;
}

function weekStartFor(value: string) {
  const date = new Date(`${value}T12:00:00`);
  const dayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOffset);
  return date;
}

function dateFrom(base: Date, offset: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + offset);
  return localDate(next.getFullYear(), next.getMonth(), next.getDate());
}

function weekdayNumber(value: string) {
  const day = new Date(`${value}T12:00:00`).getDay();
  return day === 0 ? 7 : day;
}

function recurringDates(start: string, end: string, weekdays: number[]) {
  if (!start || !end || start > end || !weekdays.length) return [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  const dates: string[] = [];
  let guard = 0;
  while (cursor <= last && guard < 367) {
    const value = localDate(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    if (weekdays.includes(weekdayNumber(value))) dates.push(value);
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
}

function durationFromTimes(startTime: string, endTime: string, fallback: number) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute);
  return minutes > 0 ? minutes : fallback;
}

function legacyMasteryText(lesson: Lesson, level: Mastery) {
  if (level === '已掌握') return lesson.masteredWhat ?? (lesson.mastery === level ? lesson.masteryNotes : '');
  if (level === '需要巩固') return lesson.needsPracticeWhat ?? (lesson.mastery === level ? lesson.masteryNotes : '');
  return lesson.notMasteredWhat ?? (lesson.mastery === level ? lesson.masteryNotes : '');
}

async function hashPin(pin: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`yang-teacher-tutor:${pin}`));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function compressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const max = 1200;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function emptyLesson(student: Student, date: string): Lesson {
  const startTime = student.defaultStartTime || '16:00';
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const endMinutes = startHour * 60 + startMinute + student.defaultDuration;
  const endTime = student.defaultEndTime || `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  const duration = durationFromTimes(startTime, endTime, student.defaultDuration);
  const fee = student.defaultHourlyRate !== undefined ? studentHourlyRate(student) * duration / 60 : student.defaultFee;
  return {
    id: `lesson-${Date.now()}`, studentId: student.id, date, startTime,
    endTime, duration, subject: student.subjects[0] || '数学', status: '已预约',
    teachingContent: '', mastery: '需要巩固', masteryNotes: '', performance: '', homework: '',
    nextPlan: '', privateNotes: '', fee: Math.round(fee * 100) / 100, payment: '待收款', photos: [],
    commuteMinutes: student.commuteMinutes || 0, commuteCost: student.commuteCost || 0,
    preparationMinutes: student.preparationMinutes || 0, wrapUpMinutes: student.wrapUpMinutes || 0,
    masteredWhat: '', needsPracticeWhat: '', notMasteredWhat: '', scheduleMode: 'weekly',
    repeatStart: date, repeatEnd: dateFrom(new Date(`${date}T12:00:00`), 28), repeatWeekdays: student.defaultWeekdays?.length ? student.defaultWeekdays : [weekdayNumber(date)],
  };
}

function studentScheduleSeriesId(studentId: string) {
  return `student-default-${studentId}`;
}

function scheduledLessonsForStudent(student: Student) {
  if (!student.autoScheduleEnabled || tutoringStatusFor(student) === 'ended') return [];
  const start = [student.tutoringStartDate || demoToday, demoToday].sort().at(-1) || demoToday;
  const end = student.tutoringEndDate || dateFrom(new Date(`${start}T12:00:00`), 182);
  const weekdays = student.defaultWeekdays?.length ? student.defaultWeekdays : [weekdayNumber(start)];
  const base = emptyLesson(student, start);
  const seriesId = studentScheduleSeriesId(student.id);
  return recurringDates(start, end, weekdays).map((date) => ({
    ...base,
    id: `${seriesId}-${date}`,
    date,
    seriesId,
    scheduleMode: 'weekly' as ScheduleMode,
    repeatStart: start,
    repeatEnd: end,
    repeatWeekdays: weekdays,
  }));
}

function emptyScheduleEntry(date: string): ScheduleEntry {
  return {
    id: `schedule-${Date.now()}`, kind: 'reminder', title: '', date,
    startTime: '12:30', endTime: '13:00', duration: 30, notes: '', completed: false,
    scheduleMode: 'single', repeatStart: date,
    repeatEnd: dateFrom(new Date(`${date}T12:00:00`), 28),
    repeatWeekdays: [weekdayNumber(date)],
  };
}

function IconButton({ label, children, onClick, pressed }: { label: string; children: React.ReactNode; onClick?: () => void; pressed?: boolean }) {
  return <button className="icon-button" onClick={onClick} aria-label={label} aria-pressed={pressed}>{children}</button>;
}

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return <span>{children}{required && <><b className="required-mark" aria-hidden="true">*</b><span className="sr-only">（必填）</span></>}</span>;
}

function useLongPress<T>(onPress: (item: T) => void, onLongPress: (item: T) => void, delay = 650) {
  const timerRef = useRef<number | null>(null);
  const resetRef = useRef<number | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef<HTMLElement | null>(null);
  const firedRef = useRef(false);
  const cancelledRef = useRef(false);

  function clearTimer() {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    targetRef.current?.classList.remove('long-pressing');
  }

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (resetRef.current !== null) window.clearTimeout(resetRef.current);
  }, []);

  return (item: T) => ({
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      clearTimer();
      if (resetRef.current !== null) window.clearTimeout(resetRef.current);
      firedRef.current = false;
      cancelledRef.current = false;
      startRef.current = { x: event.clientX, y: event.clientY };
      targetRef.current = event.currentTarget;
      event.currentTarget.classList.add('long-pressing');
      timerRef.current = window.setTimeout(() => {
        const target = targetRef.current;
        firedRef.current = true;
        timerRef.current = null;
        target?.classList.remove('long-pressing');
        target?.classList.add('long-press-selected');
        onLongPress(item);
        resetRef.current = window.setTimeout(() => {
          firedRef.current = false;
          target?.classList.remove('long-press-selected');
        }, 900);
      }, delay);
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (Math.hypot(event.clientX - startRef.current.x, event.clientY - startRef.current.y) <= 10) return;
      cancelledRef.current = true;
      clearTimer();
    },
    onPointerUp: clearTimer,
    onPointerCancel: () => {
      cancelledRef.current = true;
      clearTimer();
    },
    onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse') clearTimer();
    },
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => event.preventDefault(),
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      if (firedRef.current || cancelledRef.current) {
        event.preventDefault();
        event.stopPropagation();
        firedRef.current = false;
        cancelledRef.current = false;
        event.currentTarget.classList.remove('long-press-selected');
        return;
      }
      onPress(item);
    },
  });
}

export default function Home() {
  const rootRef = useRef<HTMLElement>(null);
  const statsContentRef = useRef<HTMLDivElement>(null);
  const periodChartScrollRef = useRef<HTMLDivElement>(null);
  const periodScrollTimerRef = useRef<number | null>(null);
  const incomeValueRef = useRef<HTMLElement>(null);
  const previousIncomeRef = useRef(0);
  const backgroundedAtRef = useRef<number | null>(null);
  const initialAppLockAppliedRef = useRef(false);
  const [students, setStudents] = useState<Student[]>(() => IS_DEMO_MODE ? initialStudents : []);
  const [lessons, setLessons] = useState<Lesson[]>(() => IS_DEMO_MODE ? initialLessons : []);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>(() => IS_DEMO_MODE ? initialScheduleEntries : []);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [tab, setTab] = useState<Tab>('calendar');
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('month');
  const [selectedDate, setSelectedDate] = useState(demoToday);
  const [monthCursor, setMonthCursor] = useState(() => { const date = new Date(`${demoToday}T12:00:00`); return new Date(date.getFullYear(), date.getMonth(), 1); });
  const [statUnit, setStatUnit] = useState<StatUnit>('月');
  const [activeStatPeriodIndex, setActiveStatPeriodIndex] = useState(18);
  const [contributionMetric, setContributionMetric] = useState<ContributionMetric>('income');
  const [query, setQuery] = useState('');
  const [studentStatusFilter, setStudentStatusFilter] = useState<StudentStatusFilter>('active');
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [lessonDraft, setLessonDraft] = useState<Lesson | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleEntry | null>(null);
  const [studentDraft, setStudentDraft] = useState<Student | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [archiveUnlocked, setArchiveUnlocked] = useState(false);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [savedToastMessage, setSavedToastMessage] = useState('已保存到本机');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [showScheduleEntries, setShowScheduleEntries] = useState(true);
  const [appLocked, setAppLocked] = useState(false);
  const agendaLessonPress = useLongPress<Lesson>(
    (lesson) => setLessonDraft({ ...lesson, scheduleMode: 'single' }),
    (lesson) => deleteLesson(lesson.id),
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<AppData>;
        if (Array.isArray(parsed.students)) setStudents(parsed.students.map((student, index) => ({
          ...student,
          locationShort: student.locationShort || '',
          fullAddress: student.fullAddress || '',
          commuteMinutes: student.commuteMinutes ?? initialStudents[index]?.commuteMinutes ?? 0,
          commuteCost: student.commuteCost ?? (IS_DEMO_MODE ? initialStudents[index]?.commuteCost : 0) ?? 0,
          preparationMinutes: student.preparationMinutes ?? (IS_DEMO_MODE ? initialStudents[index]?.preparationMinutes : 0) ?? 0,
          wrapUpMinutes: student.wrapUpMinutes ?? (IS_DEMO_MODE ? initialStudents[index]?.wrapUpMinutes : 0) ?? 0,
          defaultHourlyRate: student.defaultHourlyRate ?? (student.defaultDuration ? student.defaultFee / (student.defaultDuration / 60) : 0),
          defaultStartTime: student.defaultStartTime || (IS_DEMO_MODE ? initialStudents[index]?.defaultStartTime : '') || '16:00',
          defaultEndTime: student.defaultEndTime || (() => {
            const endMinutes = 16 * 60 + (student.defaultDuration || 90);
            return `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
          })(),
          defaultWeekdays: student.defaultWeekdays?.length ? student.defaultWeekdays : (IS_DEMO_MODE ? initialStudents[index]?.defaultWeekdays : []) || [],
          autoScheduleEnabled: student.autoScheduleEnabled || false,
          color: student.color || studentColorPalette[index % studentColorPalette.length],
          tutoringStatus: student.tutoringStatus || 'active',
          tutoringStartDate: student.tutoringStartDate || '',
          tutoringEndDate: student.tutoringEndDate || '',
        })));
        if (Array.isArray(parsed.lessons)) setLessons(parsed.lessons.map((lesson) => ({
          ...lesson,
          commuteMinutes: lesson.commuteMinutes,
          commuteCost: lesson.commuteCost,
          preparationMinutes: lesson.preparationMinutes,
          wrapUpMinutes: lesson.wrapUpMinutes,
          masteredWhat: legacyMasteryText(lesson, '已掌握'),
          needsPracticeWhat: legacyMasteryText(lesson, '需要巩固'),
          notMasteredWhat: legacyMasteryText(lesson, '未掌握'),
        })));
        if (Array.isArray(parsed.scheduleEntries)) setScheduleEntries(parsed.scheduleEntries);
        if (parsed.settings) setSettings({ ...defaultSettings, ...parsed.settings });
      }
      const storedTheme = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
      if (storedTheme) setTheme(storedTheme);
    } finally { setReady(true); }
  }, []);

  useEffect(() => {
    document.title = IS_DEMO_MODE ? '家教计薪器｜正式版功能预览' : '家教计薪器';
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, students, lessons, scheduleEntries, settings } satisfies AppData));
  }, [students, lessons, scheduleEntries, settings, ready]);

  useEffect(() => {
    if (!ready || IS_DEMO_MODE || initialAppLockAppliedRef.current) return;
    initialAppLockAppliedRef.current = true;
    if (settings.faceIdEnabled) setAppLocked(true);
  }, [ready, settings.faceIdEnabled]);

  useEffect(() => {
    if (!ready || IS_DEMO_MODE) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        backgroundedAtRef.current = Date.now();
        return;
      }
      if (!settings.faceIdEnabled || backgroundedAtRef.current === null) return;
      const elapsed = Date.now() - backgroundedAtRef.current;
      if (elapsed >= settings.autoLockMinutes * 60_000) setAppLocked(true);
      backgroundedAtRef.current = null;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [ready, settings.faceIdEnabled, settings.autoLockMinutes]);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        gsap.fromTo('.view-content', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power2.out', clearProps: 'all' });
      }, rootRef);
      return () => context.revert();
    });
    return () => mm.revert();
  }, [tab, activeStudentId, calendarMode]);

  useEffect(() => {
    if (tab !== 'stats' || !statsContentRef.current) return;
    const target = statsContentRef.current;
    const bars = target.querySelectorAll('.period-bar-button, .contribution-row');
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.killTweensOf([target, bars]);
      gsap.fromTo(target, { autoAlpha: 0.74, y: 7 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: 'power2.out', clearProps: 'all' });
      gsap.fromTo(bars, { autoAlpha: 0.58, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.24, stagger: 0.03, ease: 'power2.out', clearProps: 'all' });
    });
    return () => mm.revert();
  }, [statUnit, contributionMetric, tab]);

  const studentMap = useMemo(() => Object.fromEntries(students.map((student) => [student.id, student])), [students]);
  const calendarLessons = useMemo(() => lessons.filter((lesson) => lesson.status !== '已取消'
    && studentCanAttendOn(studentMap[lesson.studentId], lesson.date)
    && (!selectedStudentIds.length || selectedStudentIds.includes(lesson.studentId))
    && (!selectedSubjects.length || selectedSubjects.includes(lesson.subject))), [lessons, studentMap, selectedStudentIds, selectedSubjects]);
  const selectedLessons = calendarLessons.filter((lesson) => lesson.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const visibleScheduleEntries = showScheduleEntries ? scheduleEntries : [];
  const selectedScheduleEntries = visibleScheduleEntries.filter((entry) => entry.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const activeStudent = activeStudentId ? studentMap[activeStudentId] : null;

  const calendarCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const total = new Date(year, month + 1, 0).getDate();
    const previousTotal = new Date(year, month, 0).getDate();
    return Array.from({ length: 42 }, (_, index) => {
      if (index < firstWeekday) return { day: previousTotal - firstWeekday + index + 1, current: false, date: localDate(year, month - 1, previousTotal - firstWeekday + index + 1) };
      if (index >= firstWeekday + total) return { day: index - firstWeekday - total + 1, current: false, date: localDate(year, month + 1, index - firstWeekday - total + 1) };
      const day = index - firstWeekday + 1;
      return { day, current: true, date: localDate(year, month, day) };
    });
  }, [monthCursor]);

  const completedLessons = useMemo(() => lessons.filter((lesson) => lesson.status === '已完成'), [lessons]);
  const statPeriods = useMemo<StatPeriod[]>(() => buildStatPeriods(statUnit), [statUnit]);

  useEffect(() => {
    if (tab !== 'stats') return;
    const currentIndex = Math.max(0, statPeriods.findIndex((period) => period.current));
    setActiveStatPeriodIndex(currentIndex);
    window.requestAnimationFrame(() => {
      const selected = periodChartScrollRef.current?.querySelector<HTMLElement>(`[data-period-index="${currentIndex}"]`);
      selected?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }, [statPeriods, tab]);

  const safeStatPeriodIndex = Math.min(activeStatPeriodIndex, Math.max(0, statPeriods.length - 1));
  const activeStatPeriod = statPeriods[safeStatPeriodIndex];
  const periodLessons = useMemo(() => activeStatPeriod ? completedLessons.filter((lesson) => lesson.date >= activeStatPeriod.start && lesson.date <= activeStatPeriod.end) : [], [activeStatPeriod, completedLessons]);
  const stats = useMemo(() => calculateLessonStats(periodLessons, studentMap), [periodLessons, studentMap]);
  const periodValues = statPeriods.map((period) => calculateLessonStats(completedLessons.filter((lesson) => lesson.date >= period.start && lesson.date <= period.end), studentMap).receivable);
  const maxPeriodValue = Math.max(1, ...periodValues);
  const previousPeriodValue = safeStatPeriodIndex > 0 ? periodValues[safeStatPeriodIndex - 1] : 0;
  const periodChange = previousPeriodValue ? Math.round((stats.receivable - previousPeriodValue) / previousPeriodValue * 100) : stats.receivable ? 100 : 0;
  const nearbyValues = periodValues.slice(Math.max(0, safeStatPeriodIndex - 2), Math.min(periodValues.length, safeStatPeriodIndex + 3));
  const nearbyAverage = nearbyValues.length ? nearbyValues.reduce((sum, value) => sum + value, 0) / nearbyValues.length : 0;

  const contributionData = useMemo(() => students.map((student) => {
    const items = periodLessons.filter((lesson) => lesson.studentId === student.id);
    const paid = items.filter((lesson) => lesson.payment === '已收款').reduce((sum, lesson) => sum + lesson.fee, 0);
    const hours = items.reduce((sum, lesson) => sum + lesson.duration, 0) / 60;
    return { student, income: paid, hours, lessons: items.length };
  }).filter((item) => item.income || item.hours || item.lessons), [periodLessons, students]);
  const contributionTotal = Math.max(0, contributionData.reduce((sum, item) => sum + item[contributionMetric], 0));

  useEffect(() => {
    const node = incomeValueRef.current;
    if (!node || tab !== 'stats') return;
    const targetValue = stats.receivable;
    const startValue = previousIncomeRef.current;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const value = { amount: startValue };
      gsap.killTweensOf(value);
      gsap.to(value, { amount: targetValue, duration: 0.28, ease: 'power3.out', onUpdate: () => { node.textContent = cnMoney.format(Math.round(value.amount)); } });
    });
    mm.add('(prefers-reduced-motion: reduce)', () => { node.textContent = cnMoney.format(targetValue); });
    previousIncomeRef.current = targetValue;
    return () => mm.revert();
  }, [stats.receivable, tab]);

  useEffect(() => () => {
    if (periodScrollTimerRef.current !== null) window.clearTimeout(periodScrollTimerRef.current);
  }, []);

  function scrollToStatPeriod(index: number) {
    const bounded = Math.max(0, Math.min(index, statPeriods.length - 1));
    setActiveStatPeriodIndex(bounded);
    window.requestAnimationFrame(() => {
      const target = periodChartScrollRef.current?.querySelector<HTMLElement>(`[data-period-index="${bounded}"]`);
      target?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
  }

  function syncStatPeriodAfterScroll() {
    if (periodScrollTimerRef.current !== null) window.clearTimeout(periodScrollTimerRef.current);
    periodScrollTimerRef.current = window.setTimeout(() => {
      const scroller = periodChartScrollRef.current;
      if (!scroller) return;
      const center = scroller.scrollLeft + scroller.clientWidth / 2;
      const buttons = Array.from(scroller.querySelectorAll<HTMLElement>('[data-period-index]'));
      if (!buttons.length) return;
      const closest = buttons.reduce((best, button) => Math.abs(button.offsetLeft + button.offsetWidth / 2 - center) < Math.abs(best.offsetLeft + best.offsetWidth / 2 - center) ? button : best, buttons[0]);
      const index = Number(closest?.dataset.periodIndex);
      if (Number.isFinite(index)) setActiveStatPeriodIndex(index);
    }, 120);
  }

  function goMonth(offset: number) {
    const next = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + offset, 1);
    setMonthCursor(next);
    setSelectedDate(localDate(next.getFullYear(), next.getMonth(), 1));
  }

  function goWeek(offset: number) {
    const start = weekStartFor(selectedDate);
    const nextDate = dateFrom(start, offset * 7);
    const next = new Date(`${nextDate}T12:00:00`);
    setSelectedDate(nextDate);
    setMonthCursor(new Date(next.getFullYear(), next.getMonth(), 1));
  }

  function openNewLesson() {
    const student = students.find((item) => tutoringStatusFor(item) === 'active') || students[0];
    if (!student) {
      setTab('students');
      openNewStudent();
      setSavedToastMessage('请先建立一位学生档案');
      setSavedToast(true);
      window.setTimeout(() => setSavedToast(false), 1800);
      return;
    }
    setLessonDraft(emptyLesson(student, selectedDate));
  }

  function openNewScheduleEntry() {
    setScheduleDraft(emptyScheduleEntry(selectedDate));
  }

  function saveLesson(complete = false) {
    if (!lessonDraft) return;
    const next = complete ? { ...lessonDraft, status: '已完成' as LessonStatus } : lessonDraft;
    if (next.scheduleMode === 'weekly') {
      const selectedStudent = students.find((student) => student.id === next.studentId);
      const dates = recurringDates(next.repeatStart || next.date, next.repeatEnd || next.date, next.repeatWeekdays || []).filter((date) => studentCanAttendOn(selectedStudent, date));
      const seriesId = next.seriesId || `series-${Date.now()}`;
      const generated = dates.map((date) => ({ ...next, id: `${seriesId}-${date}`, date, seriesId }));
      const withoutDraft = lessons.filter((item) => item.id !== next.id);
      const existingKeys = new Set(withoutDraft.map((item) => `${item.studentId}|${item.date}|${item.startTime}|${item.subject}`));
      const unique = generated.filter((item) => {
        const key = `${item.studentId}|${item.date}|${item.startTime}|${item.subject}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });
      setLessons([...withoutDraft, ...unique]);
      setSavedToastMessage(unique.length ? `已生成 ${unique.length} 节重复课程` : '相同课程已存在，无需重复添加');
    } else {
      setLessons((items) => items.some((item) => item.id === next.id) ? items.map((item) => item.id === next.id ? next : item) : [...items, next]);
      setSavedToastMessage('课程已保存到本机');
    }
    setLessonDraft(null); setSavedToast(true); window.setTimeout(() => setSavedToast(false), 1800);
  }

  function deleteLesson(id: string) {
    if (!window.confirm('确定删除这节课程吗？此操作不可撤销。')) return false;
    setLessons((items) => items.filter((item) => item.id !== id));
    setLessonDraft(null);
    setSavedToastMessage('课程已删除');
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 1800);
    return true;
  }

  function saveScheduleEntry() {
    if (!scheduleDraft || !scheduleDraft.title.trim()) return;
    const next = { ...scheduleDraft, duration: durationFromTimes(scheduleDraft.startTime, scheduleDraft.endTime, scheduleDraft.duration) };
    if (next.scheduleMode === 'weekly') {
      const dates = recurringDates(next.repeatStart || next.date, next.repeatEnd || next.date, next.repeatWeekdays || []);
      const seriesId = next.seriesId || `schedule-series-${Date.now()}`;
      const generated = dates.map((date) => ({ ...next, id: `${seriesId}-${date}`, date, seriesId }));
      const withoutDraft = scheduleEntries.filter((item) => item.id !== next.id);
      const existingKeys = new Set(withoutDraft.map((item) => `${item.title}|${item.date}|${item.startTime}`));
      const unique = generated.filter((item) => {
        const key = `${item.title}|${item.date}|${item.startTime}`;
        if (existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });
      setScheduleEntries([...withoutDraft, ...unique]);
      setSavedToastMessage(unique.length ? `已生成 ${unique.length} 项固定安排` : '相同安排已存在，无需重复添加');
    } else {
      setScheduleEntries((items) => items.some((item) => item.id === next.id) ? items.map((item) => item.id === next.id ? next : item) : [...items, next]);
      setSavedToastMessage(next.kind === 'todo' ? '待办已保存' : '提醒已保存');
    }
    setScheduleDraft(null); setSavedToast(true); window.setTimeout(() => setSavedToast(false), 1800);
  }

  function deleteScheduleEntry(id: string) {
    if (window.confirm('确定删除这项安排吗？此操作不可撤销。')) {
      setScheduleEntries((items) => items.filter((item) => item.id !== id));
      setScheduleDraft(null);
    }
  }

  function openNewStudent() {
    setStudentDraft({ id: `student-${Date.now()}`, name: '', nickname: '', grade: '一年级', school: '', parentName: '', parentPhone: '', subjects: ['数学'], defaultDuration: 90, defaultFee: 300, defaultHourlyRate: 200, defaultStartTime: '16:00', defaultEndTime: '17:30', defaultWeekdays: [weekdayNumber(demoToday)], autoScheduleEnabled: false, preparationMinutes: 0, wrapUpMinutes: 0, commuteCost: 0, notes: '', locationShort: '', fullAddress: '', commuteMinutes: 0, color: studentColorPalette[students.length % studentColorPalette.length], tutoringStatus: 'active', tutoringStartDate: demoToday, tutoringEndDate: '' });
  }

  function saveStudent() {
    if (!studentDraft || !studentDraft.name.trim()) return;
    const normalizedStatus: TutoringStatus = studentDraft.tutoringEndDate && studentDraft.tutoringEndDate < demoToday ? 'ended' : (studentDraft.tutoringStatus || 'active');
    const startTime = studentDraft.defaultStartTime || '16:00';
    const endTime = studentDraft.defaultEndTime || '17:30';
    const duration = durationFromTimes(startTime, endTime, studentDraft.defaultDuration || 90);
    const hourlyRate = Math.max(0, studentHourlyRate(studentDraft));
    const nextStudent = {
      ...studentDraft,
      tutoringStatus: normalizedStatus,
      defaultStartTime: startTime,
      defaultEndTime: endTime,
      defaultDuration: duration,
      defaultHourlyRate: hourlyRate,
      defaultFee: Math.round(hourlyRate * duration / 60 * 100) / 100,
      defaultWeekdays: studentDraft.defaultWeekdays || [],
    };
    setStudents((items) => items.some((item) => item.id === nextStudent.id) ? items.map((item) => item.id === nextStudent.id ? nextStudent : item) : [...items, nextStudent]);
    const seriesId = studentScheduleSeriesId(nextStudent.id);
    const generated = scheduledLessonsForStudent(nextStudent);
    setLessons((items) => {
      const preserved = items.filter((item) => item.seriesId !== seriesId || item.date < demoToday);
      const keys = new Set(preserved.map((item) => `${item.studentId}|${item.date}|${item.startTime}|${item.subject}`));
      return [...preserved, ...generated.filter((item) => {
        const key = `${item.studentId}|${item.date}|${item.startTime}|${item.subject}`;
        if (keys.has(key)) return false;
        keys.add(key);
        return true;
      })];
    });
    setStudentDraft(null);
    setSavedToastMessage(generated.length ? `学生已保存，课表同步 ${generated.length} 节课` : '学生档案已保存');
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 1800);
  }

  function switchTab(next: Tab) { setTab(next); setActiveStudentId(null); }

  function updateStudentArchive(id: string, changes: Partial<Student>) {
    setStudents((items) => items.map((student) => student.id === id ? { ...student, ...changes } : student));
  }

  function showToast(message: string) {
    setSavedToastMessage(message);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 2200);
  }

  async function exportEncryptedBackup(password: string) {
    const data: AppData = { version: 1, students, lessons, scheduleEntries, settings };
    const backup = await encryptBackup(data, password);
    const serialized = JSON.stringify(backup, null, 2);
    const filename = `家教计薪器备份-${demoToday}.yangtutor`;
    if (await saveAndShareBackup(filename, serialized)) {
      showToast('加密备份已打开系统分享');
      return;
    }
    const blob = new Blob([serialized], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast('加密备份已导出');
  }

  async function importEncryptedBackup(file: File, password: string) {
    const backup = JSON.parse(await file.text()) as EncryptedBackup;
    const data = await decryptBackup<AppData>(backup, password);
    if (data.version !== 1 || !Array.isArray(data.students) || !Array.isArray(data.lessons) || !Array.isArray(data.scheduleEntries)) throw new Error('备份内容不完整。');
    if (!window.confirm('导入会替换当前设备中的全部数据。是否继续？')) return;
    setStudents(data.students);
    setLessons(data.lessons);
    setScheduleEntries(data.scheduleEntries);
    setSettings({ ...defaultSettings, ...data.settings });
    showToast('备份已安全恢复');
  }

  async function syncNotifications() {
    const result = await syncLocalNotifications(lessons, students, settings);
    if (!result.native) {
      showToast('网页预览不会创建真实通知');
      return;
    }
    showToast(result.scheduled ? `已同步 ${result.scheduled} 条本地提醒` : '已清除本地提醒');
  }

  async function setFaceIdProtection(enabled: boolean) {
    if (!enabled) {
      setSettings((current) => ({ ...current, faceIdEnabled: false }));
      showToast('Face ID 全应用锁已关闭');
      return;
    }
    if (!IS_DEMO_MODE) {
      const result = await authenticateAppLock();
      if (!result.success) throw new Error('未能完成系统身份验证。');
    }
    setSettings((current) => ({ ...current, faceIdEnabled: true }));
    showToast(IS_DEMO_MODE ? '演示版 Face ID 流程已开启' : 'Face ID 全应用锁已开启');
  }

  const monthLessons = calendarLessons.filter((lesson) => lesson.date.startsWith(`${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`));
  const monthScheduleEntries = visibleScheduleEntries.filter((entry) => entry.date.startsWith(`${monthCursor.getFullYear()}-${String(monthCursor.getMonth() + 1).padStart(2, '0')}`));
  const activeFilterCount = selectedStudentIds.length + selectedSubjects.length + (showScheduleEntries ? 0 : 1);
  const selectedWeekStart = weekStartFor(selectedDate);
  const selectedWeekEnd = dateFrom(selectedWeekStart, 6);
  const calendarTitle = calendarMode === 'month'
    ? `${monthCursor.getFullYear()}年${monthCursor.getMonth() + 1}月`
    : `${formatShortDate(dateFrom(selectedWeekStart, 0))}–${formatShortDate(selectedWeekEnd)}`;
  const selectedAgenda = [
    ...selectedLessons.map((lesson) => ({ type: 'lesson' as const, startTime: lesson.startTime, lesson })),
    ...selectedScheduleEntries.map((entry) => ({ type: 'schedule' as const, startTime: entry.startTime, entry })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <main className="app-shell" ref={rootRef}>
      <aside className="brand-panel">
        <div className="brand-row"><div className="brand-mark">薪</div><span>家教计薪器</span></div>
        <div>
          <p className="eyebrow light">Private teaching journal</p>
          <h1>记录每一次教学，<br />也记录每一点进步。</h1>
          <p className="brand-copy">为私人家教定制的课表与计薪工作台。报价、通勤成本和真实时薪，一处清楚记录。</p>
        </div>
        <div className="privacy-note"><LockKeyhole size={14} aria-hidden="true" /> 数据仅保存在本机</div>
      </aside>

      <section className="phone-surface">
        {IS_DEMO_MODE && <div className="demo-banner" role="note"><ShieldCheck size={16} aria-hidden="true" /><span><strong>正式版功能预览</strong> · 独立虚构数据，与求职 Demo 完全隔离</span></div>}
        <header className="topbar">
          <div>
            <p className="muted">晚上好，杨老师</p>
            <h2 className={tab === 'calendar' ? 'calendar-date-title' : ''}>{tab === 'calendar' ? calendarTitle : tab === 'students' ? '我的学生' : tab === 'stats' ? '教学统计' : '安全与设置'}</h2>
          </div>
          <div className="header-actions">
            <IconButton label={theme === 'light' ? '切换深色模式' : '切换浅色模式'} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </IconButton>
            {tab === 'calendar' && <button className="schedule-add-button" onClick={openNewScheduleEntry} aria-label="新增待办或提醒"><BellRing size={19} aria-hidden="true" /><span>事项</span></button>}
            {(tab === 'calendar' || tab === 'students') && <button className="add-button" onClick={tab === 'students' ? openNewStudent : openNewLesson} aria-label={tab === 'students' ? '新增学生' : '新增课程'}><Plus size={23} /></button>}
          </div>
        </header>

        {tab === 'calendar' && (
          <div className="view-content">
            <section className={`month-card ${calendarMode === 'week' ? 'week-mode' : ''}`} aria-label={calendarMode === 'month' ? '课程月历' : '每周课程表'}>
              <div className="calendar-view-switch" role="group" aria-label="日历视图">
                <button className={calendarMode === 'month' ? 'active' : ''} onClick={() => setCalendarMode('month')} aria-pressed={calendarMode === 'month'}><CalendarDays size={15} aria-hidden="true" />月视图</button>
                <button className={calendarMode === 'week' ? 'active' : ''} onClick={() => setCalendarMode('week')} aria-pressed={calendarMode === 'week'}><CalendarRange size={15} aria-hidden="true" />周课表</button>
              </div>
              <div className="calendar-filter-bar">
                <button className={`filter-trigger ${activeFilterCount ? 'active' : ''}`} onClick={() => setFilterOpen((value) => !value)} aria-expanded={filterOpen} aria-controls="calendar-filters"><Filter size={15} aria-hidden="true" />筛选{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
                <small>{!showScheduleEntries ? '已隐藏非课程待办' : activeFilterCount ? '当前仅显示已选课程' : '显示全部课程与待办'}</small>
              </div>
              {filterOpen && <CalendarFilters students={students} selectedStudentIds={selectedStudentIds} selectedSubjects={selectedSubjects} showScheduleEntries={showScheduleEntries} onStudentChange={setSelectedStudentIds} onSubjectChange={setSelectedSubjects} onScheduleVisibilityChange={setShowScheduleEntries} />}
              <div className="calendar-heading">
                <button className="today-button" onClick={() => { const date = new Date(`${demoToday}T12:00:00`); setMonthCursor(new Date(date.getFullYear(), date.getMonth(), 1)); setSelectedDate(demoToday); }}>今天</button>
                <p>{calendarMode === 'month' ? `${monthLessons.length} 节课 · ${monthScheduleEntries.length} 项提醒` : '08:00–22:00 · 点击课程或提醒查看'}</p>
                <div className="month-nav">
                  <IconButton label={calendarMode === 'month' ? '上个月' : '上一周'} onClick={() => calendarMode === 'month' ? goMonth(-1) : goWeek(-1)}><ChevronLeft size={18} /></IconButton>
                  <IconButton label={calendarMode === 'month' ? '下个月' : '下一周'} onClick={() => calendarMode === 'month' ? goMonth(1) : goWeek(1)}><ChevronRight size={18} /></IconButton>
                </div>
              </div>
              {calendarMode === 'month' ? <>
                <div className="calendar-grid weekday-row" aria-hidden="true">{weekDays.map((day) => <span key={day}>{day}</span>)}</div>
                <div className="calendar-grid">
                  {calendarCells.map((cell) => {
                    const dayLessons = calendarLessons.filter((item) => item.date === cell.date);
                    const dayScheduleEntries = visibleScheduleEntries.filter((item) => item.date === cell.date);
                    const dayStudents = [...new Map(dayLessons.map((lesson) => [lesson.studentId, studentMap[lesson.studentId]])).values()].filter(Boolean) as Student[];
                    const colors = dayStudents.map((student) => studentColor(student));
                    const tint = colors.length === 1
                      ? colorWash(colors[0], 0.22)
                      : colors.length > 1
                        ? `linear-gradient(135deg, ${colors.slice(0, 3).map((color, index, items) => `${colorWash(color, 0.24)} ${index / items.length * 100}% ${(index + 1) / items.length * 100}%`).join(', ')})`
                        : undefined;
                    const lessonNames = dayStudents.map((student) => student.nickname || student.name).join('、');
                    return <button key={cell.date} style={tint ? { background: tint } : undefined} onClick={() => setSelectedDate(cell.date)} className={`date-cell ${dayLessons.length ? 'has-lessons' : ''} ${dayScheduleEntries.length ? 'has-schedule-entry' : ''} ${cell.date === selectedDate ? 'active' : ''} ${!cell.current ? 'outside' : ''}`} aria-label={`${cell.date}${dayLessons.length ? `，${dayLessons.length}节课：${lessonNames}` : ''}${dayScheduleEntries.length ? `，${dayScheduleEntries.length}项待办或提醒` : ''}`}><span>{cell.day}</span>{colors.length > 0 && <i className="student-color-dots" aria-hidden="true">{colors.slice(0, 3).map((color, index) => <b key={`${color}-${index}`} style={{ backgroundColor: color }} />)}</i>}{dayScheduleEntries.length > 0 && <i className="calendar-schedule-mark" aria-hidden="true"><b /></i>}</button>;
                  })}
                </div>
              </> : <WeekCalendar selectedDate={selectedDate} lessons={calendarLessons} scheduleEntries={visibleScheduleEntries} students={studentMap} onSelectDate={setSelectedDate} onLesson={(lesson) => setLessonDraft({ ...lesson, scheduleMode: 'single' })} onDeleteLesson={(lesson) => deleteLesson(lesson.id)} onScheduleEntry={(entry) => setScheduleDraft({ ...entry, scheduleMode: 'single' })} />}
            </section>

            <section className="schedule-section">
              <div className="section-heading">
                <div><p className="eyebrow">{formatShortDate(selectedDate)}</p><h3>当天安排</h3></div>
                <div className="schedule-heading-meta"><small>长按课程可删除</small><span className="count-badge">{selectedLessons.length} 课 · {selectedScheduleEntries.length} 事项</span></div>
              </div>
              {selectedAgenda.length ? selectedAgenda.map((agendaItem) => {
                if (agendaItem.type === 'schedule') {
                  const entry = agendaItem.entry;
                  return <button className={`schedule-entry-card ${entry.kind} ${entry.completed ? 'completed' : ''}`} key={entry.id} onClick={() => setScheduleDraft({ ...entry, scheduleMode: 'single' })}>
                    <div className="schedule-shape" aria-hidden="true">{entry.kind === 'todo' ? <ListTodo size={16} /> : <BellRing size={16} />}</div>
                    <div className="time-block"><strong>{entry.startTime}</strong><span>{entry.duration} 分钟</span></div>
                    <div className="schedule-entry-info"><strong>{entry.title}</strong><p>{entry.notes || (entry.kind === 'todo' ? '非课程待办' : '固定时间提醒')}</p></div>
                    <span className="schedule-entry-status">{entry.completed ? '已完成' : entry.kind === 'todo' ? '待处理' : '提醒'}</span>
                    <ChevronRight size={16} className="chevron" aria-hidden="true" />
                  </button>;
                }
                const lesson = agendaItem.lesson;
                const student = studentMap[lesson.studentId];
                return <button className="lesson-card long-pressable" style={{ borderLeftColor: studentColor(student) }} key={lesson.id} {...agendaLessonPress(lesson)} aria-label={`${student?.nickname || student?.name}的${lesson.subject}课程，点击编辑，长按删除`}>
                  <div className="time-block"><strong>{lesson.startTime}</strong><span>{lesson.duration} 分钟</span></div>
                  <div className="lesson-line" />
                  <div className="lesson-info"><div className="avatar" style={avatarStyle(student)}>{student?.nickname?.[0] || student?.name?.[0]}</div><div><strong>{student?.nickname || student?.name} · {lesson.subject}</strong><p className="lesson-location"><MapPin size={12} aria-hidden="true" />{student?.locationShort || '地点待填写'}</p><p>{lesson.teachingContent || '等待填写课后记录'}</p></div></div>
                  <span className={`status ${lesson.status === '已完成' ? 'done' : lesson.status === '已取消' ? 'cancelled' : 'booked'}`}>{lesson.status}</span>
                  <ChevronRight size={16} className="chevron" aria-hidden="true" />
                </button>;
              }) : <div className="agenda-empty-actions"><EmptyState icon={<CalendarDays />} title="当天还没有安排" action="添加课程" onAction={openNewLesson} /><button className="secondary-button" onClick={openNewScheduleEntry}><BellRing size={16} />添加待办或提醒</button></div>}
            </section>
          </div>
        )}

        {tab === 'students' && (
          <div className="view-content">
            {activeStudent ? <StudentDetail student={activeStudent} lessons={lessons.filter((item) => item.studentId === activeStudent.id)} onBack={() => setActiveStudentId(null)} onLesson={(lesson) => setLessonDraft({ ...lesson, scheduleMode: 'single' })} onEdit={() => setStudentDraft({ ...activeStudent })} archiveUnlocked={archiveUnlocked} onRequestUnlock={() => setPinDialogOpen(true)} onLock={() => setArchiveUnlocked(false)} onArchiveChange={(changes) => updateStudentArchive(activeStudent.id, changes)} /> : <>
              <div className="student-status-filter" role="group" aria-label="学生授课状态筛选">
                {([
                  { value: 'active' as const, label: '正在授课', count: students.filter((student) => tutoringStatusFor(student) === 'active').length },
                  { value: 'ended' as const, label: '已结课', count: students.filter((student) => tutoringStatusFor(student) === 'ended').length },
                  { value: 'all' as const, label: '全部学生', count: students.length },
                ]).map((item) => <button type="button" key={item.value} className={studentStatusFilter === item.value ? 'selected' : ''} aria-pressed={studentStatusFilter === item.value} onClick={() => setStudentStatusFilter(item.value)}><span>{item.label}</span><b>{item.count}</b></button>)}
              </div>
              <label className="search-field"><Search size={18} aria-hidden="true" /><span className="sr-only">搜索学生</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索学生姓名" /></label>
              <div className="student-list">
                {students.filter((student) => (studentStatusFilter === 'all' || tutoringStatusFor(student) === studentStatusFilter) && `${student.name}${student.nickname}`.toLowerCase().includes(query.toLowerCase())).map((student) => {
                  const history = lessons.filter((item) => item.studentId === student.id && item.status === '已完成');
                  const minutes = history.reduce((sum, item) => sum + item.duration, 0);
                  const latest = [...history].sort((a, b) => b.date.localeCompare(a.date))[0];
                  return <button className="student-card" style={{ borderLeftColor: studentColor(student) }} key={student.id} onClick={() => setActiveStudentId(student.id)}>
                    <div className="avatar large" style={avatarStyle(student)}>{student.nickname?.[0] || student.name[0]}</div>
                    <div className="student-main"><div><div className="student-name-line"><h3>{student.nickname || student.name}</h3><span className={`tutoring-status-chip ${tutoringStatusFor(student)}`}>{tutoringStatusLabel(student)}</span></div><p>{student.name} · {student.grade}{student.locationShort ? ` · ${student.locationShort}` : ''}</p><small className="tutoring-period-line">{student.tutoringStartDate ? `${formatShortDate(student.tutoringStartDate)}开始` : '开始日期待补充'}{student.tutoringEndDate ? ` · ${formatShortDate(student.tutoringEndDate)}结束` : ' · 持续中'}</small></div><ChevronRight size={18} aria-hidden="true" /></div>
                    <div className="student-metrics"><span><strong>{history.length}</strong> 次课</span><span><strong>{(minutes / 60).toFixed(1)}</strong> 小时</span><span><strong>{latest ? formatShortDate(latest.date) : '—'}</strong> 最近</span></div>
                  </button>;
                })}
              </div>
            </>}
          </div>
        )}

        {tab === 'stats' && (
          <div className="view-content stats-view">
            <div className="range-switcher" role="group" aria-label="统计计量单位" style={{ '--range-index': statUnits.indexOf(statUnit) } as React.CSSProperties}><i className="range-active-indicator" aria-hidden="true" />{statUnits.map((item) => <button key={item} className={statUnit === item ? 'active' : ''} onClick={() => setStatUnit(item)} aria-pressed={statUnit === item}>{item}</button>)}</div>
            <div className="stats-content" ref={statsContentRef} aria-live="polite">
            <section className="income-hero">
              <div className="income-period-heading"><div><p>{activeStatPeriod?.detail || statUnit}报价应收</p><strong ref={incomeValueRef}>{cnMoney.format(stats.receivable)}</strong></div><small>未扣通勤<br />邻近均值 {cnMoney.format(nearbyAverage)}</small></div>
              <span className={`trend ${periodChange < 0 ? 'down' : ''}`}><BarChart3 size={15} />较上一期间 {periodChange >= 0 ? '+' : ''}{periodChange}%</span>
              <div className="period-chart-meta"><span>每根柱代表 1{statUnit} · 左右滑动查看相邻期间</span><div><button type="button" onClick={() => scrollToStatPeriod(safeStatPeriodIndex - 1)} disabled={safeStatPeriodIndex === 0} aria-label={`查看上一个${statUnit}`}><ChevronLeft size={15} aria-hidden="true" /></button><button type="button" onClick={() => scrollToStatPeriod(safeStatPeriodIndex + 1)} disabled={safeStatPeriodIndex === statPeriods.length - 1} aria-label={`查看下一个${statUnit}`}><ChevronRight size={15} aria-hidden="true" /></button></div></div>
              <div className="period-chart-scroll" ref={periodChartScrollRef} onScroll={syncStatPeriodAfterScroll} tabIndex={0} aria-label={`${statUnit}收入时间序列，可左右滑动`}>
                <div className="period-chart" role="group" aria-label={`${statUnit}收入期间选择`} data-unit={statUnit}>
                  {statPeriods.map((period, index) => {
                    const value = periodValues[index] || 0;
                    const selected = index === safeStatPeriodIndex;
                    return <button type="button" className={`period-bar-button ${selected ? 'selected' : ''} ${period.current ? 'current' : ''}`} key={period.key} data-period-index={index} aria-pressed={selected} aria-label={`${period.detail}，应收${cnMoney.format(value)}${period.current ? '，当前期间' : ''}`} onClick={() => scrollToStatPeriod(index)}><span className="period-bar-track"><i className="period-bar-fill" style={{ transform: `scaleY(${value / maxPeriodValue})` }} /></span><small>{period.label}</small><b>{value ? `${Math.round(value / 100) / 10}k` : '0'}</b></button>;
                  })}
                </div>
              </div>
            </section>
            <div className="metric-grid four">
              <Metric icon={<BookOpen />} label="完成课程" value={`${stats.count} 节`} />
              <Metric icon={<Clock3 />} label="总课时" value={`${stats.hours.toFixed(1)} h`} />
              <Metric icon={<CircleDollarSign />} label="课内时薪" value={`${cnMoney.format(stats.hourly)}/h`} />
              <Metric icon={<Clock3 />} label="真实时薪" value={`${cnMoney.format(stats.effectiveHourly)}/h`} />
            </div>
            <section className="expense-card">
              <div className="section-heading compact"><div><p className="eyebrow">Real earnings</p><h3>通勤支出与真实投入</h3><small>{activeStatPeriod?.detail || statUnit} · 报价收入保持原口径</small></div><strong>−{cnMoney.format(stats.commuteCost)}</strong></div>
              <div className="expense-summary-grid">
                <div><span>扣除通勤后</span><strong>{cnMoney.format(stats.netIncome)}</strong></div>
                <div><span>总投入时间</span><strong>{stats.workHours.toFixed(1)} h</strong></div>
              </div>
              <div className="time-cost-breakdown" aria-label={`往返通勤${Math.round(stats.commuteTime)}分钟，备课${Math.round(stats.preparationTime)}分钟，善后${Math.round(stats.wrapUpTime)}分钟`}>
                <span><Navigation size={14} aria-hidden="true" />往返通勤 <strong>{Math.round(stats.commuteTime)} 分钟</strong></span>
                <span><BookOpen size={14} aria-hidden="true" />备课 <strong>{Math.round(stats.preparationTime)} 分钟</strong></span>
                <span><Check size={14} aria-hidden="true" />善后 <strong>{Math.round(stats.wrapUpTime)} 分钟</strong></span>
              </div>
              <p className="effective-rate-note">真实时薪按“（报价 − 通勤费用）÷ 全部投入时间”计算。</p>
            </section>
            <section className="payment-card">
              <div className="section-heading compact"><div><p className="eyebrow">Payment</p><h3>收款进度</h3></div><strong>{stats.receivable ? Math.round(stats.paid / stats.receivable * 100) : 0}%</strong></div>
              <div className="progress-track"><i style={{ transform: `scaleX(${stats.receivable ? stats.paid / stats.receivable : 0})` }} /></div>
              <div className="payment-split"><span>已收 <strong>{cnMoney.format(stats.paid)}</strong></span><span>待收 <strong>{cnMoney.format(stats.unpaid)}</strong></span></div>
            </section>
            <section className="contribution-card">
              <div className="section-heading compact"><div><p className="eyebrow">Contribution</p><h3>学生贡献占比</h3><small>{activeStatPeriod?.detail || statUnit}</small></div></div>
              <div className="contribution-switch" role="group" aria-label="学生贡献指标">
                {([{ value: 'income' as const, label: '收款' }, { value: 'hours' as const, label: '课时' }, { value: 'lessons' as const, label: '课数' }]).map((item) => <button type="button" key={item.value} className={contributionMetric === item.value ? 'selected' : ''} aria-pressed={contributionMetric === item.value} onClick={() => setContributionMetric(item.value)}>{item.label}</button>)}
              </div>
              {contributionData.length ? <>
                <div className="contribution-stack" role="img" aria-label={contributionData.map((item) => `${item.student.nickname || item.student.name}${contributionTotal ? Math.round(item[contributionMetric] / contributionTotal * 100) : 0}%`).join('，')}>{contributionData.map((item) => <i key={item.student.id} style={{ width: `${contributionTotal ? item[contributionMetric] / contributionTotal * 100 : 0}%`, backgroundColor: studentColor(item.student) }} />)}</div>
                <div className="contribution-legend">{contributionData.map((item) => {
                  const value = item[contributionMetric];
                  const percent = contributionTotal ? Math.round(value / contributionTotal * 100) : 0;
                  const display = contributionMetric === 'income' ? cnMoney.format(value) : contributionMetric === 'hours' ? `${value.toFixed(1)} h` : `${value} 节`;
                  return <div className="contribution-row" key={item.student.id}><div className="avatar small" style={avatarStyle(item.student)}>{item.student.nickname?.[0] || item.student.name[0]}</div><div><span><span><i style={{ backgroundColor: studentColor(item.student) }} />{item.student.nickname || item.student.name}</span><strong>{display} · {percent}%</strong></span><div className="mini-track"><i style={{ transform: `scaleX(${percent / 100})`, backgroundColor: studentColor(item.student) }} /></div></div></div>;
                })}</div>
              </> : <p className="contribution-empty">这个期间还没有已完成课程。</p>}
            </section>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <SettingsView
            settings={settings}
            onSettingsChange={setSettings}
            students={students}
            lessons={lessons}
            scheduleEntries={scheduleEntries}
            onFaceIdChange={setFaceIdProtection}
            onExport={exportEncryptedBackup}
            onImport={importEncryptedBackup}
            onSyncNotifications={syncNotifications}
            onLock={() => setAppLocked(true)}
          />
        )}

        <nav className="tabbar" aria-label="主要导航">
          <button className={tab === 'calendar' ? 'selected' : ''} onClick={() => switchTab('calendar')} aria-current={tab === 'calendar' ? 'page' : undefined}><CalendarDays size={20} />日历</button>
          <button className={tab === 'students' ? 'selected' : ''} onClick={() => switchTab('students')} aria-current={tab === 'students' ? 'page' : undefined}><Users size={20} />学生</button>
          <button className={tab === 'stats' ? 'selected' : ''} onClick={() => switchTab('stats')} aria-current={tab === 'stats' ? 'page' : undefined}><BarChart3 size={20} />统计</button>
          <button className={tab === 'settings' ? 'selected' : ''} onClick={() => switchTab('settings')} aria-current={tab === 'settings' ? 'page' : undefined}><Settings2 size={20} />设置</button>
        </nav>

        {lessonDraft && <LessonEditor draft={lessonDraft} students={students} isNew={!lessons.some((lesson) => lesson.id === lessonDraft.id)} onChange={setLessonDraft} onClose={() => setLessonDraft(null)} onSave={saveLesson} onDelete={() => deleteLesson(lessonDraft.id)} />}
        {scheduleDraft && <ScheduleEntryEditor draft={scheduleDraft} isNew={!scheduleEntries.some((entry) => entry.id === scheduleDraft.id)} onChange={setScheduleDraft} onClose={() => setScheduleDraft(null)} onSave={saveScheduleEntry} onDelete={() => deleteScheduleEntry(scheduleDraft.id)} />}
        {studentDraft && <StudentEditor draft={studentDraft} onChange={setStudentDraft} onClose={() => setStudentDraft(null)} onSave={saveStudent} />}
        {pinDialogOpen && <ArchivePinDialog onClose={() => setPinDialogOpen(false)} onUnlock={() => { setArchiveUnlocked(true); setPinDialogOpen(false); }} />}
        {savedToast && <div className="toast" role="status"><Check size={17} /> {savedToastMessage}</div>}
        {appLocked && <AppLock onUnlock={() => setAppLocked(false)} />}
      </section>
    </main>
  );
}

function SettingsView({ settings, onSettingsChange, students, lessons, scheduleEntries, onFaceIdChange, onExport, onImport, onSyncNotifications, onLock }: {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  students: Student[];
  lessons: Lesson[];
  scheduleEntries: ScheduleEntry[];
  onFaceIdChange: (enabled: boolean) => Promise<void>;
  onExport: (password: string) => Promise<void>;
  onImport: (file: File, password: string) => Promise<void>;
  onSyncNotifications: () => Promise<void>;
  onLock: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [faceIdBusy, setFaceIdBusy] = useState(false);
  const [faceIdError, setFaceIdError] = useState('');
  const upcoming = lessons
    .filter((lesson) => lesson.status === '已预约' && lesson.date >= demoToday)
    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
    .slice(0, 3);

  async function exportData() {
    setBackupError('');
    setBackupBusy(true);
    try { await onExport(backupPassword); setBackupPassword(''); }
    catch (error) { setBackupError(error instanceof Error ? error.message : '备份导出失败。'); }
    finally { setBackupBusy(false); }
  }

  async function importData(file?: File) {
    if (!file) return;
    setBackupError('');
    setBackupBusy(true);
    try { await onImport(file, backupPassword); setBackupPassword(''); }
    catch (error) { setBackupError(error instanceof Error ? error.message : '备份导入失败。'); }
    finally { setBackupBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  return <div className="view-content settings-view">
    <section className="settings-overview" aria-label="正式版状态">
      <div className="settings-overview-icon"><Smartphone size={22} aria-hidden="true" /></div>
      <div><p className="eyebrow">Formal edition</p><h3>正式版本机模式</h3><p>课程、学生档案和照片默认只存在设备里，不依赖境外服务。</p></div>
      <span>{IS_DEMO_MODE ? '网页预览' : 'iPhone 正式构建'}</span>
    </section>

    <section className="settings-card">
      <div className="settings-card-heading"><div><Fingerprint size={19} aria-hidden="true" /></div><div><h3>隐私与解锁</h3><p>{IS_DEMO_MODE ? '网页预览模拟系统 Face ID 流程。' : '使用系统 Face ID，并保留设备密码兜底。'}</p></div></div>
      <button type="button" className="setting-row" disabled={faceIdBusy} onClick={async () => { setFaceIdError(''); setFaceIdBusy(true); try { await onFaceIdChange(!settings.faceIdEnabled); } catch (error) { setFaceIdError(error instanceof Error ? error.message : 'Face ID 设置失败。'); } finally { setFaceIdBusy(false); } }} aria-pressed={settings.faceIdEnabled}>
        <span><strong>Face ID 全应用锁</strong><small>{faceIdBusy ? '正在验证身份…' : '开启后保护全部课程和学生资料'}</small></span><i className={`setting-toggle ${settings.faceIdEnabled ? 'enabled' : ''}`} aria-hidden="true"><b /></i>
      </button>
      {faceIdError && <p className="backup-error" role="alert">{faceIdError}</p>}
      <label className="setting-select-row"><span><strong>离开后自动锁定</strong><small>返回应用时重新验证</small></span><select value={settings.autoLockMinutes} onChange={(event) => onSettingsChange({ ...settings, autoLockMinutes: Number(event.target.value) })}><option value={0}>立即</option><option value={1}>1 分钟</option><option value={5}>5 分钟</option><option value={15}>15 分钟</option></select></label>
      <button type="button" className="settings-secondary-action" onClick={onLock} disabled={!settings.faceIdEnabled}><LockKeyhole size={16} aria-hidden="true" />{settings.faceIdEnabled ? '立即锁定测试' : '开启 Face ID 后可测试'}</button>
      {IS_DEMO_MODE && <p className="settings-footnote"><Info size={14} aria-hidden="true" />网页演示仅模拟 Face ID 流程，不会访问面容信息。</p>}
    </section>

    <section className="settings-card">
      <div className="settings-card-heading"><div><BellRing size={19} aria-hidden="true" /></div><div><h3>课程通知</h3><p>同时计算课前提醒和出发提醒。</p></div></div>
      <button type="button" className="setting-row" onClick={() => onSettingsChange({ ...settings, notificationsEnabled: !settings.notificationsEnabled })} aria-pressed={settings.notificationsEnabled}>
        <span><strong>允许本地通知</strong><small>不发送给第三方服务器</small></span><i className={`setting-toggle ${settings.notificationsEnabled ? 'enabled' : ''}`} aria-hidden="true"><b /></i>
      </button>
      <div className="settings-number-grid">
        <label><span>课前提醒</span><div><input type="number" min="0" max="1440" inputMode="numeric" value={settings.lessonReminderMinutes} onChange={(event) => onSettingsChange({ ...settings, lessonReminderMinutes: Math.max(0, Number(event.target.value)) })} /><small>分钟</small></div></label>
        <label><span>通勤缓冲</span><div><input type="number" min="0" max="120" inputMode="numeric" value={settings.departureBufferMinutes} onChange={(event) => onSettingsChange({ ...settings, departureBufferMinutes: Math.max(0, Number(event.target.value)) })} /><small>分钟</small></div></label>
      </div>
      <div className="notification-preview"><strong>接下来的提醒预览</strong>{upcoming.length ? upcoming.map((lesson) => {
        const student = students.find((item) => item.id === lesson.studentId);
        const departure = (student?.commuteMinutes || 0) + settings.departureBufferMinutes;
        return <div key={lesson.id}><span style={{ backgroundColor: studentColor(student) }} /><p><strong>{formatShortDate(lesson.date)} {lesson.startTime} · {student?.nickname || student?.name}</strong><small>课前 {settings.lessonReminderMinutes} 分钟{student?.commuteMinutes ? `；出发提醒为课前 ${departure} 分钟` : '；补全通勤时间后计算出发提醒'}</small></p></div>;
      }) : <p className="settings-empty">还没有将来的已预约课程。</p>}</div>
      <button type="button" className="settings-secondary-action" disabled={notificationBusy} onClick={async () => { setNotificationError(''); setNotificationBusy(true); try { await onSyncNotifications(); } catch (error) { setNotificationError(error instanceof Error ? error.message : '同步通知失败。'); } finally { setNotificationBusy(false); } }}><BellRing size={16} aria-hidden="true" />{notificationBusy ? '正在同步…' : '同步本机提醒'}</button>
      {notificationError && <p className="backup-error" role="alert">{notificationError}</p>}
    </section>

    <section className="settings-card">
      <div className="settings-card-heading"><div><FileKey2 size={19} aria-hidden="true" /></div><div><h3>加密备份</h3><p>用密码保护学生档案，导出到“文件”后可跨设备恢复。</p></div></div>
      <div className="data-summary"><span><Users size={15} />{students.length} 位学生</span><span><BookOpen size={15} />{lessons.length} 节课</span><span><Database size={15} />{scheduleEntries.length} 项安排</span></div>
      <label className="backup-password"><span>备份密码（至少 6 位）</span><input type="password" autoComplete="new-password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} placeholder="导出与导入时使用同一密码" /></label>
      {backupError && <p className="backup-error" role="alert">{backupError}</p>}
      <div className="backup-actions"><button type="button" className="primary-button" disabled={backupBusy || backupPassword.length < 6} onClick={exportData}><Download size={16} />导出加密备份</button><button type="button" className="secondary-button" disabled={backupBusy || backupPassword.length < 6} onClick={() => fileRef.current?.click()}><Upload size={16} />导入恢复</button></div>
      <input ref={fileRef} hidden type="file" accept=".yangtutor,application/json" onChange={(event) => importData(event.target.files?.[0])} />
      <p className="settings-footnote"><ShieldCheck size={14} aria-hidden="true" />AES-GCM 加密，备份密码不会被保存。忘记密码时无法恢复。</p>
    </section>

    <section className="settings-card compact-settings-card">
      <div className="settings-card-heading"><div><Info size={19} aria-hidden="true" /></div><div><h3>关于正式版</h3><p>为中国大陆 iPhone 用户设计，优先离线可用。</p></div></div>
      <a className="setting-link" href="./privacy.html" target="_blank" rel="noreferrer"><span>隐私政策</span><ExternalLink size={16} /></a>
      <a className="setting-link" href="./support.html" target="_blank" rel="noreferrer"><span>支持与数据恢复</span><ExternalLink size={16} /></a>
    </section>
  </div>;
}

function AppLock({ onUnlock }: { onUnlock: () => void }) {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  async function unlock() {
    setError('');
    setChecking(true);
    if (IS_DEMO_MODE) {
      window.setTimeout(() => { setChecking(false); onUnlock(); }, 620);
      return;
    }
    try {
      const result = await authenticateAppLock();
      if (result.success) onUnlock();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '验证未完成，请重试。');
    } finally {
      setChecking(false);
    }
  }
  return <div className="app-lock" role="dialog" aria-modal="true" aria-labelledby="app-lock-title">
    <div className="app-lock-mark">杨</div>
    <div><p className="eyebrow">Private workspace</p><h2 id="app-lock-title">家教计薪器已锁定</h2><p>课程、学生资料和私密备注均已隐藏。</p></div>
    <button type="button" className="face-id-button" onClick={unlock} disabled={checking} autoFocus><Fingerprint size={24} aria-hidden="true" />{checking ? '正在验证…' : IS_DEMO_MODE ? '模拟 Face ID 解锁' : '使用 Face ID 解锁'}</button>
    {error && <p className="app-lock-error" role="alert">{error}</p>}
    {IS_DEMO_MODE && <small>此页只演示正式版解锁交互。</small>}
    {!IS_DEMO_MODE && <small>多次识别失败时，可按系统提示使用设备密码。</small>}
  </div>;
}

function CalendarFilters({ students, selectedStudentIds, selectedSubjects, showScheduleEntries, onStudentChange, onSubjectChange, onScheduleVisibilityChange }: { students: Student[]; selectedStudentIds: string[]; selectedSubjects: Subject[]; showScheduleEntries: boolean; onStudentChange: (ids: string[]) => void; onSubjectChange: (subjects: Subject[]) => void; onScheduleVisibilityChange: (show: boolean) => void }) {
  return <section className="calendar-filters" id="calendar-filters" aria-label="课表筛选">
    <div className="filter-group">
      <div className="filter-group-heading"><strong>学生</strong><button type="button" onClick={() => onStudentChange([])} aria-pressed={!selectedStudentIds.length}>全部学生</button></div>
      <div className="filter-chips">{students.map((student) => {
        const selected = selectedStudentIds.includes(student.id);
        return <button type="button" key={student.id} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => onStudentChange(selected ? selectedStudentIds.filter((id) => id !== student.id) : [...selectedStudentIds, student.id])}><i style={{ backgroundColor: studentColor(student) }} aria-hidden="true" />{student.nickname || student.name}<Check size={13} aria-hidden="true" /></button>;
      })}</div>
    </div>
    <div className="filter-group">
      <div className="filter-group-heading"><strong>科目</strong><button type="button" onClick={() => onSubjectChange([])} aria-pressed={!selectedSubjects.length}>全部科目</button></div>
      <div className="filter-chips subject-filter-chips">{subjects.map((subject) => {
        const selected = selectedSubjects.includes(subject);
        return <button type="button" key={subject} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => onSubjectChange(selected ? selectedSubjects.filter((item) => item !== subject) : [...selectedSubjects, subject])}>{subject}<Check size={13} aria-hidden="true" /></button>;
      })}</div>
    </div>
    <div className="filter-group schedule-visibility-group">
      <div className="filter-group-heading"><strong>非课程安排</strong></div>
      <button type="button" className={`schedule-visibility-toggle ${showScheduleEntries ? 'selected' : ''}`} aria-pressed={showScheduleEntries} onClick={() => onScheduleVisibilityChange(!showScheduleEntries)}>
        <span aria-hidden="true">{showScheduleEntries ? <Check size={15} /> : <X size={15} />}</span>
        <div><strong>{showScheduleEntries ? '显示待办与提醒' : '隐藏待办与提醒'}</strong><small>影响月历标记、周课表和当天安排</small></div>
        <i aria-hidden="true"><b /></i>
      </button>
    </div>
    <p>学生和科目可多选；未勾选某一分类时，该分类默认显示全部。</p>
  </section>;
}

function WeekCalendar({ selectedDate, lessons, scheduleEntries, students, onSelectDate, onLesson, onDeleteLesson, onScheduleEntry }: { selectedDate: string; lessons: Lesson[]; scheduleEntries: ScheduleEntry[]; students: Record<string, Student>; onSelectDate: (date: string) => void; onLesson: (lesson: Lesson) => void; onDeleteLesson: (lesson: Lesson) => void; onScheduleEntry: (entry: ScheduleEntry) => void }) {
  const start = weekStartFor(selectedDate);
  const days = weekDays.map((label, index) => ({ label, date: dateFrom(start, index) }));
  const [expanded, setExpanded] = useState(false);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const expandedScrollRef = useRef<HTMLDivElement>(null);

  function closeExpanded() {
    setExpanded(false);
  }

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExpanded();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.setTimeout(() => expandButtonRef.current?.focus(), 0);
    };
  }, [expanded]);

  function trapDialogFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  function scrollExpanded(direction: -1 | 1) {
    expandedScrollRef.current?.scrollBy({ left: direction * 300, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  return <>
    <div className="week-version-bar">
      <div className="week-version-switch" role="group" aria-label="周课表详细程度">
        <button type="button" className="selected" aria-pressed="true">简略版</button>
        <button type="button" ref={expandButtonRef} aria-pressed="false" onClick={() => setExpanded(true)}><Maximize2 size={14} aria-hidden="true" />完整课表</button>
      </div>
      <small>点击编辑 · 长按课程删除</small>
    </div>
    <WeekTimeline compact days={days} lessons={lessons} scheduleEntries={scheduleEntries} students={students} selectedDate={selectedDate} onSelectDate={onSelectDate} onLesson={onLesson} onDeleteLesson={onDeleteLesson} onScheduleEntry={onScheduleEntry} />
    {expanded && <div className="expanded-week-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeExpanded(); }}>
      <section className="expanded-week-dialog" role="dialog" aria-modal="true" aria-labelledby="expanded-week-title" onKeyDown={trapDialogFocus}>
        <header>
          <div><p className="eyebrow">Full weekly schedule</p><h2 id="expanded-week-title">完整周课表</h2><span>{formatShortDate(days[0].date)}–{formatShortDate(days[6].date)} · 08:00–22:00</span></div>
          <button ref={closeButtonRef} type="button" className="week-return-button" onClick={closeExpanded}><ArrowLeft size={17} aria-hidden="true" />返回简略版</button>
        </header>
        <div className="expanded-week-tools">
          <button type="button" className="week-return-button week-toolbar-return" onClick={closeExpanded}><ArrowLeft size={16} aria-hidden="true" />收起为简略版</button>
          <p className="expanded-week-hint"><Maximize2 size={14} aria-hidden="true" />左右滑动查看整周；点击课程编辑，长按课程删除。</p>
          <div className="week-scroll-controls"><button type="button" className="icon-button" onClick={() => scrollExpanded(-1)} aria-label="向左查看课表"><ChevronLeft size={18} aria-hidden="true" /></button><button type="button" className="icon-button" onClick={() => scrollExpanded(1)} aria-label="向右查看课表"><ChevronRight size={18} aria-hidden="true" /></button></div>
        </div>
        <div className="expanded-week-scroll" ref={expandedScrollRef} tabIndex={0}>
          <WeekTimeline days={days} lessons={lessons} scheduleEntries={scheduleEntries} students={students} selectedDate={selectedDate} onSelectDate={onSelectDate} onLesson={(lesson) => { setExpanded(false); onLesson(lesson); }} onDeleteLesson={onDeleteLesson} onScheduleEntry={(entry) => { setExpanded(false); onScheduleEntry(entry); }} />
        </div>
      </section>
    </div>}
  </>;
}

function WeekTimeline({ compact = false, days, lessons, scheduleEntries, students, selectedDate, onSelectDate, onLesson, onDeleteLesson, onScheduleEntry }: { compact?: boolean; days: { label: string; date: string }[]; lessons: Lesson[]; scheduleEntries: ScheduleEntry[]; students: Record<string, Student>; selectedDate: string; onSelectDate: (date: string) => void; onLesson: (lesson: Lesson) => void; onDeleteLesson: (lesson: Lesson) => void; onScheduleEntry: (entry: ScheduleEntry) => void }) {
  const startHour = 8;
  const endHour = 22;
  const rowHeight = compact ? 32 : 64;
  const totalHeight = (endHour - startHour) * rowHeight;
  const hourLines = Array.from({ length: endHour - startHour + 1 }, (_, index) => index + startHour);
  const timeLabels = compact ? hourLines.filter((hour) => (hour - startHour) % 2 === 0) : hourLines;
  const lessonPress = useLongPress(onLesson, onDeleteLesson);

  return <div className={`week-timeline ${compact ? 'compact' : 'full'}`} aria-label={compact ? '简略周课表，纵轴时间，横轴星期' : '完整周课表，纵轴时间，横轴星期'}>
    <div className="week-timeline-header">
      <span aria-hidden="true">时间</span>
      {days.map((day) => <button type="button" key={day.date} className={day.date === selectedDate ? 'active' : ''} onClick={() => onSelectDate(day.date)} aria-pressed={day.date === selectedDate}><small>周{day.label}</small><strong>{Number(day.date.slice(-2))}</strong></button>)}
    </div>
    <div className="week-timeline-body" style={{ height: totalHeight }}>
      <div className="week-time-axis" aria-hidden="true">{timeLabels.map((hour) => <span key={hour} style={{ top: (hour - startHour) * rowHeight }}>{String(hour).padStart(2, '0')}:00</span>)}</div>
      <div className="week-timeline-columns">
        {days.map((day) => <div className={`week-timeline-day ${day.date === selectedDate ? 'selected-day' : ''}`} key={day.date}>
          {hourLines.map((hour) => <i className="week-hour-line" key={hour} style={{ top: (hour - startHour) * rowHeight }} />)}
          {lessons.filter((lesson) => lesson.date === day.date).map((lesson) => {
            const [hour, minute] = lesson.startTime.split(':').map(Number);
            const startMinutes = (hour - startHour) * 60 + minute;
            const top = Math.max(0, startMinutes / 60 * rowHeight);
            const available = Math.max(0, totalHeight - top - 1);
            const height = Math.min(available, Math.max(compact ? 20 : 42, lesson.duration / 60 * rowHeight - (compact ? 1 : 4)));
            const student = students[lesson.studentId];
            const color = studentColor(student);
            const compactName = student?.nickname?.slice(0, 3) || student?.name?.slice(-2) || '学生';
            if (top >= totalHeight || height <= 0) return null;
            return <button type="button" className={`week-timeline-lesson long-pressable ${compact ? 'compact-lesson' : 'full-lesson'} ${lesson.duration < 75 ? 'short-lesson' : ''}`} key={lesson.id} style={{ top, height, backgroundColor: color, borderColor: colorWash(color, 0.72), color: contrastText(color) }} {...lessonPress(lesson)} aria-label={`${day.date} ${lesson.startTime}到${lesson.endTime}，${student?.nickname || student?.name}，${lesson.subject}${student?.locationShort ? `，${student.locationShort}` : ''}；点击编辑，长按删除`}>
              {compact ? <><span>{lesson.startTime}</span><strong>{compactName}</strong><small>{lesson.subject.slice(0, 1)}</small></> : <><strong>{lesson.startTime}–{lesson.endTime}</strong><span>{student?.nickname || student?.name}</span><small>{lesson.subject}{student?.locationShort ? ` · ${student.locationShort}` : ''}</small></>}
            </button>;
          })}
          {scheduleEntries.filter((entry) => entry.date === day.date).map((entry) => {
            const [hour, minute] = entry.startTime.split(':').map(Number);
            const startMinutes = (hour - startHour) * 60 + minute;
            const top = Math.max(0, startMinutes / 60 * rowHeight);
            const available = Math.max(0, totalHeight - top - 1);
            const height = Math.min(available, Math.max(compact ? 16 : 36, entry.duration / 60 * rowHeight - (compact ? 1 : 4)));
            if (top >= totalHeight || height <= 0) return null;
            return <button type="button" className={`week-schedule-entry ${compact ? 'compact-schedule-entry' : 'full-schedule-entry'} ${entry.kind} ${entry.completed ? 'completed' : ''}`} key={entry.id} style={{ top, height }} onClick={() => onScheduleEntry(entry)} aria-label={`${day.date} ${entry.startTime}到${entry.endTime}，${entry.kind === 'todo' ? '待办' : '提醒'}：${entry.title}${entry.completed ? '，已完成' : ''}`}>
              {compact ? <><span>{entry.kind === 'todo' ? '办' : '铃'}</span><strong>{entry.title.slice(0, 3)}</strong></> : <><strong>{entry.startTime} · {entry.kind === 'todo' ? '待办' : '提醒'}</strong><span>{entry.title}</span><small>{entry.completed ? '已完成' : entry.notes || '点击查看详情'}</small></>}
            </button>;
          })}
        </div>)}
      </div>
    </div>
  </div>;
}

function EmptyState({ icon, title, action, onAction }: { icon: React.ReactNode; title: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span>{icon}</span><h4>{title}</h4><button className="secondary-button" onClick={onAction}><Plus size={16} />{action}</button></div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="metric-card"><span>{icon}</span><p>{label}</p><strong>{value}</strong></div>;
}

function StudentDetail({ student, lessons, onBack, onLesson, onEdit, archiveUnlocked, onRequestUnlock, onLock, onArchiveChange }: { student: Student; lessons: Lesson[]; onBack: () => void; onLesson: (lesson: Lesson) => void; onEdit: () => void; archiveUnlocked: boolean; onRequestUnlock: () => void; onLock: () => void; onArchiveChange: (changes: Partial<Student>) => void }) {
  const completed = lessons.filter((item) => item.status === '已完成').sort((a, b) => b.date.localeCompare(a.date));
  const hours = completed.reduce((sum, item) => sum + item.duration, 0) / 60;
  const income = completed.reduce((sum, item) => sum + item.fee, 0);
  const phonePress = useLongPress<string>(() => undefined, (phone) => {
    if (!callPhone(phone)) window.alert('请先在学生档案中填写可拨打的家长电话。');
  });
  return <div className="student-detail">
    <div className="detail-actions"><button className="back-button" onClick={onBack}><ArrowLeft size={18} />全部学生</button><button className="text-button" onClick={onEdit}>编辑资料</button></div>
    <section className="student-hero"><div className="avatar xlarge" style={avatarStyle(student)}>{student.nickname?.[0] || student.name[0]}</div><div><p className="eyebrow">{student.school}</p><div className="student-name-line"><h3>{student.nickname || student.name}</h3><span className={`tutoring-status-chip ${tutoringStatusFor(student)}`}>{tutoringStatusLabel(student)}</span></div><p>{student.name} · {student.grade} · {student.subjects.join(' / ')}</p></div></section>
    <div className="summary-strip"><span><strong>{completed.length}</strong>次课程</span><span><strong>{hours.toFixed(1)}</strong>小时</span><span><strong>{cnMoney.format(income)}</strong>累计</span></div>
    <section className="tutoring-period-card"><div><CalendarRange size={19} aria-hidden="true" /></div><div><strong>授课周期</strong><p>{student.tutoringStartDate ? `${formatShortDate(student.tutoringStartDate)}开始` : '开始日期待补充'}{student.tutoringEndDate ? `，${formatShortDate(student.tutoringEndDate)}结课` : '，目前持续授课中'}</p><small>{tutoringStatusFor(student) === 'active' ? '后续每周排课会自动保留在授课周期内。' : '已停止生成结课日期之后的每周课程。'}</small></div></section>
    <section className="location-card">
      <div className="location-icon" style={{ backgroundColor: colorWash(studentColor(student), 0.18), color: studentColor(student) }}><MapPin size={19} aria-hidden="true" /></div>
      <div><div className="location-card-heading"><strong>上课地点</strong><span style={{ backgroundColor: studentColor(student), color: contrastText(studentColor(student)) }}>{student.locationShort || '地点待填写'}</span></div><p>{student.fullAddress || '还没有填写详细地址。'}</p><small><Clock3 size={13} aria-hidden="true" />{student.commuteMinutes ? `单程通勤约 ${student.commuteMinutes} 分钟` : '还没有填写通勤时间'}</small><div className="contact-actions"><button type="button" onClick={() => { if (!openAppleMaps(student.fullAddress || '')) window.alert('请先填写详细地址。'); }}><Navigation size={15} aria-hidden="true" />苹果地图导航</button><button type="button" className="long-pressable" {...phonePress(student.parentPhone)} aria-label={`长按拨打${student.parentName || '家长'}电话`}><Phone size={15} aria-hidden="true" />长按拨打家长</button></div></div>
    </section>
    <section className="profile-note"><GraduationCap size={18} /><div><strong>教学提醒</strong><p>{student.notes || '还没有添加教学提醒。'}</p></div></section>
    <section className={`private-archive ${archiveUnlocked ? 'unlocked' : 'locked'}`}>
      <header><div className="archive-icon">{archiveUnlocked ? <LockOpen size={19} aria-hidden="true" /> : <ShieldCheck size={19} aria-hidden="true" />}</div><div><p className="eyebrow">Private archive</p><h3>老师私密档案</h3></div>{archiveUnlocked && <button className="archive-lock-button" onClick={onLock}><LockKeyhole size={15} aria-hidden="true" />锁定</button>}</header>
      {archiveUnlocked ? <div className="archive-fields">
        <label><span>我对学生的评价</span><textarea value={student.teacherEvaluation || ''} onChange={(event) => onArchiveChange({ teacherEvaluation: event.target.value })} placeholder="学习习惯、性格、沟通方式、长期观察…" /></label>
        <label><span>我对学生家长的评价</span><textarea value={student.parentEvaluation || ''} onChange={(event) => onArchiveChange({ parentEvaluation: event.target.value })} placeholder="沟通偏好、反馈节奏、需要留意的事项…" /></label>
        <label><span>其他私人备注</span><textarea value={student.archiveNotes || ''} onChange={(event) => onArchiveChange({ archiveNotes: event.target.value })} placeholder="只给自己看的记录" /></label>
        <p className="archive-save-hint"><Check size={14} aria-hidden="true" />修改会自动保存在本机</p>
      </div> : <div className="archive-locked-state"><p>学生评价、家长评价和私人备注已隐藏。刷新页面后会自动重新锁定。</p><button className="primary-button" onClick={onRequestUnlock}><LockOpen size={17} aria-hidden="true" />解锁私密档案</button></div>}
    </section>
    <div className="section-heading compact"><div><p className="eyebrow">Learning path</p><h3>学习轨迹</h3></div></div>
    <div className="timeline">{completed.map((lesson) => <button key={lesson.id} onClick={() => onLesson(lesson)}><i className={`mastery-dot ${lesson.mastery}`} /><div><span>{formatShortDate(lesson.date)} · {lesson.subject}</span><strong>{lesson.teachingContent}</strong><MasteryBadges lesson={lesson} /><p>{lesson.nextPlan ? `下次：${lesson.nextPlan}` : '还没有填写下次计划'}</p></div><ChevronRight size={16} aria-hidden="true" /></button>)}</div>
  </div>;
}

function MasteryBadges({ lesson }: { lesson: Lesson }) {
  const entries = [
    { label: '已掌握', value: legacyMasteryText(lesson, '已掌握'), className: 'mastered' },
    { label: '需巩固', value: legacyMasteryText(lesson, '需要巩固'), className: 'practice' },
    { label: '未掌握', value: legacyMasteryText(lesson, '未掌握'), className: 'not-mastered' },
  ].filter((entry) => entry.value.trim());
  return entries.length ? <div className="mastery-badges">{entries.map((entry) => <span className={entry.className} key={entry.label}><b>{entry.label}</b>{entry.value}</span>)}</div> : <div className="mastery-badges"><span className="empty"><b>掌握记录</b>待补充</span></div>;
}

function ScheduleEntryEditor({ draft, isNew, onChange, onClose, onSave, onDelete }: { draft: ScheduleEntry; isNew: boolean; onChange: (entry: ScheduleEntry) => void; onClose: () => void; onSave: () => void; onDelete: () => void }) {
  const isWeekly = draft.scheduleMode === 'weekly';
  const repeatDates = recurringDates(draft.repeatStart || draft.date, draft.repeatEnd || draft.date, draft.repeatWeekdays || []);
  const invalidTime = draft.endTime <= draft.startTime;
  const canSave = draft.title.trim() && !invalidTime && (!isWeekly || repeatDates.length > 0);

  function setScheduleMode(mode: ScheduleMode) {
    if (mode === 'single') onChange({ ...draft, scheduleMode: mode, repeatStart: draft.date, repeatEnd: draft.date, repeatWeekdays: [weekdayNumber(draft.date)] });
    else onChange({ ...draft, scheduleMode: mode, repeatStart: draft.repeatStart || draft.date, repeatEnd: draft.repeatEnd || dateFrom(new Date(`${draft.date}T12:00:00`), 28), repeatWeekdays: draft.repeatWeekdays?.length ? draft.repeatWeekdays : [weekdayNumber(draft.date)] });
  }

  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="sheet schedule-entry-sheet" role="dialog" aria-modal="true" aria-labelledby="schedule-entry-title">
      <div className="sheet-handle" />
      <header className="sheet-header"><div><p className="eyebrow">Personal schedule</p><h2 id="schedule-entry-title">{isNew ? '新增待办或提醒' : '编辑待办或提醒'}</h2></div><IconButton label="关闭" onClick={onClose}><X size={20} /></IconButton></header>
      <div className="sheet-content">
        <section className="form-section">
          <div className="form-section-heading"><span>{draft.kind === 'todo' ? <ListTodo size={18} /> : <BellRing size={18} />}</span><div><strong>安排类型</strong><small>用不同于课程色块的形状显示</small></div></div>
          <div className="entry-kind-switch" role="group" aria-label="安排类型">
            <button type="button" className={draft.kind === 'todo' ? 'selected' : ''} aria-pressed={draft.kind === 'todo'} onClick={() => onChange({ ...draft, kind: 'todo' })}><ListTodo size={16} aria-hidden="true" />非课程待办</button>
            <button type="button" className={draft.kind === 'reminder' ? 'selected' : ''} aria-pressed={draft.kind === 'reminder'} onClick={() => onChange({ ...draft, kind: 'reminder' })}><BellRing size={16} aria-hidden="true" />固定时间提醒</button>
          </div>
          <p className="required-legend"><b aria-hidden="true">*</b> 为必填项，补充说明可稍后填写</p>
          <label className="field"><FieldLabel required>标题</FieldLabel><input required value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} placeholder={draft.kind === 'todo' ? '例如：整理错题卡' : '例如：提前出发去学生家'} autoFocus /></label>
          <label className="field"><FieldLabel>补充说明</FieldLabel><textarea value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} placeholder="所需材料、地点、需要联系的人……" /></label>
        </section>

        <section className="form-section">
          <div className="form-section-heading"><span><CalendarRange size={18} /></span><div><strong>日期与重复</strong><small>可保存一次，也可按周循环</small></div></div>
          <div className="schedule-mode-switch" role="group" aria-label="安排重复方式"><button type="button" className={!isWeekly ? 'selected' : ''} aria-pressed={!isWeekly} onClick={() => setScheduleMode('single')}>单次安排</button><button type="button" className={isWeekly ? 'selected' : ''} aria-pressed={isWeekly} onClick={() => setScheduleMode('weekly')}><Repeat2 size={15} aria-hidden="true" />按周循环</button></div>
          {!isWeekly ? <label className="field first-field"><FieldLabel required>日期</FieldLabel><input required type="date" value={draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value, repeatStart: event.target.value, repeatEnd: event.target.value, repeatWeekdays: [weekdayNumber(event.target.value)] })} /></label> : <>
            <div className="date-range-grid"><label><FieldLabel required>开始日期</FieldLabel><input required type="date" value={draft.repeatStart || draft.date} onChange={(event) => onChange({ ...draft, repeatStart: event.target.value, date: event.target.value })} /></label><i>至</i><label><FieldLabel required>结束日期</FieldLabel><input required type="date" value={draft.repeatEnd || draft.date} onChange={(event) => onChange({ ...draft, repeatEnd: event.target.value })} /></label></div>
            <fieldset className="weekday-picker" aria-required="true"><legend><FieldLabel required>每周重复</FieldLabel></legend><div>{weekDays.map((day, index) => { const value = index + 1; const selected = (draft.repeatWeekdays || []).includes(value); return <button type="button" key={day} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => onChange({ ...draft, repeatWeekdays: selected ? (draft.repeatWeekdays || []).filter((item) => item !== value) : [...(draft.repeatWeekdays || []), value].sort() })}>周{day}<Check size={11} aria-hidden="true" /></button>; })}</div></fieldset>
            <p className="repeat-summary"><Repeat2 size={14} aria-hidden="true" />当前将生成 <strong>{repeatDates.length}</strong> 项固定安排</p>
          </>}
          <div className="form-grid two time-grid"><label><FieldLabel required>开始时间</FieldLabel><input required type="time" value={draft.startTime} onChange={(event) => onChange({ ...draft, startTime: event.target.value, duration: durationFromTimes(event.target.value, draft.endTime, draft.duration) })} /></label><label><FieldLabel required>结束时间</FieldLabel><input required type="time" value={draft.endTime} onChange={(event) => onChange({ ...draft, endTime: event.target.value, duration: durationFromTimes(draft.startTime, event.target.value, draft.duration) })} /></label></div>
          {invalidTime && <p className="schedule-error" role="alert">结束时间需要晚于开始时间。</p>}
        </section>

        <section className="form-section completion-section"><button type="button" className={draft.completed ? 'completion-toggle completed' : 'completion-toggle'} aria-pressed={draft.completed} onClick={() => onChange({ ...draft, completed: !draft.completed })}><span><Check size={17} aria-hidden="true" /></span><div><strong>{draft.completed ? '已标记为完成' : '标记为已完成'}</strong><small>完成后仍保留在课表中，方便回顾。</small></div></button></section>
      </div>
      <footer className="sheet-footer"><button className="primary-button" onClick={onSave} disabled={!canSave}><Check size={17} />保存安排</button>{!isNew && <button className="danger-button" onClick={onDelete}><Trash2 size={17} />删除</button>}</footer>
    </section>
  </div>;
}

function LessonEditor({ draft, students, isNew, onChange, onClose, onSave, onDelete }: { draft: Lesson; students: Student[]; isNew: boolean; onChange: (lesson: Lesson) => void; onClose: () => void; onSave: (complete?: boolean) => void; onDelete: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scheduleError, setScheduleError] = useState('');
  const isWeekly = draft.scheduleMode === 'weekly';
  const selectedStudent = students.find((student) => student.id === draft.studentId);
  const costBreakdown = lessonCostBreakdown(draft, selectedStudent);
  const repeatDates = recurringDates(draft.repeatStart || draft.date, draft.repeatEnd || draft.date, draft.repeatWeekdays || []).filter((date) => studentCanAttendOn(selectedStudent, date));
  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const encoded = await Promise.all(Array.from(files).slice(0, 4).map(compressPhoto));
    onChange({ ...draft, photos: [...draft.photos, ...encoded] });
  }
  function updateMastery(field: 'masteredWhat' | 'needsPracticeWhat' | 'notMasteredWhat', value: string) {
    const next = {
      ...draft,
      masteredWhat: legacyMasteryText(draft, '已掌握'),
      needsPracticeWhat: legacyMasteryText(draft, '需要巩固'),
      notMasteredWhat: legacyMasteryText(draft, '未掌握'),
      [field]: value,
      masteryNotes: '',
    };
    const mastery: Mastery = next.notMasteredWhat.trim() ? '未掌握' : next.needsPracticeWhat.trim() ? '需要巩固' : next.masteredWhat.trim() ? '已掌握' : draft.mastery;
    onChange({ ...next, mastery });
  }
  function setScheduleMode(mode: ScheduleMode) {
    setScheduleError('');
    if (mode === 'single') {
      onChange({ ...draft, scheduleMode: mode, date: draft.repeatStart || draft.date });
      return;
    }
    const start = draft.repeatStart || draft.date;
    onChange({
      ...draft,
      scheduleMode: mode,
      repeatStart: start,
      repeatEnd: draft.repeatEnd || dateFrom(new Date(`${start}T12:00:00`), 28),
      repeatWeekdays: draft.repeatWeekdays?.length ? draft.repeatWeekdays : [weekdayNumber(start)],
    });
  }
  function submitLesson(complete = false) {
    if (!draft.studentId) { setScheduleError('请选择学生。'); return; }
    if (!draft.startTime || !draft.endTime) { setScheduleError('请填写完整的上课时间。'); return; }
    if (draft.endTime <= draft.startTime) { setScheduleError('结束时间需要晚于开始时间。'); return; }
    if (!Number.isFinite(draft.fee) || draft.fee < 0) { setScheduleError('请填写正确的课程价格。'); return; }
    if (!isWeekly && !draft.date) { setScheduleError('请选择上课日期。'); return; }
    if (isWeekly) {
      const start = draft.repeatStart || '';
      const end = draft.repeatEnd || '';
      if (!start || !end) { setScheduleError('请选择重复排课的开始和结束日期。'); return; }
      if (start > end) { setScheduleError('结束日期不能早于开始日期。'); return; }
      if (!(draft.repeatWeekdays || []).length) { setScheduleError('请至少选择一个上课星期。'); return; }
      if ((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / 86400000 > 366) { setScheduleError('单次最多安排一年，请缩短日期区间。'); return; }
      if (!repeatDates.length) { setScheduleError('当前区间内没有匹配的上课日期。'); return; }
    }
    setScheduleError('');
    onSave(complete);
  }
  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="lesson-title">
      <div className="sheet-handle" />
      <header className="sheet-header"><div><p className="eyebrow">Lesson journal</p><h2 id="lesson-title">课程记录</h2></div><IconButton label="关闭" onClick={onClose}><X size={20} /></IconButton></header>
      <div className="sheet-content">
        <section className="form-section schedule-form-section">
          <div className="form-section-heading"><span><CalendarDays size={17} aria-hidden="true" /></span><div><strong>核心排课</strong><small>学生、时间与价格优先填写</small></div></div>
          <p className="required-legend"><b aria-hidden="true">*</b> 为必填项，其余内容可以课后再补充</p>
          <div className="schedule-mode-switch" role="group" aria-label="排课方式">
            <button type="button" className={!isWeekly ? 'selected' : ''} aria-pressed={!isWeekly} onClick={() => setScheduleMode('single')}><CalendarDays size={16} aria-hidden="true" />单次课程</button>
            <button type="button" className={isWeekly ? 'selected' : ''} aria-pressed={isWeekly} onClick={() => setScheduleMode('weekly')}><Repeat2 size={16} aria-hidden="true" />每周重复</button>
          </div>
          <label className="lesson-student-field"><FieldLabel required>学生</FieldLabel><select required value={draft.studentId} onChange={(event) => {
            const student = students.find((item) => item.id === event.target.value);
            if (!student) return;
            const next = emptyLesson(student, draft.date);
            onChange({
              ...draft,
              studentId: student.id,
              fee: next.fee,
              duration: next.duration,
              startTime: next.startTime,
              endTime: next.endTime,
              subject: student.subjects[0] || draft.subject,
              commuteMinutes: student.commuteMinutes || 0,
              commuteCost: student.commuteCost || 0,
              preparationMinutes: student.preparationMinutes || 0,
              wrapUpMinutes: student.wrapUpMinutes || 0,
              repeatWeekdays: student.defaultWeekdays?.length ? student.defaultWeekdays : draft.repeatWeekdays,
            });
          }}>{students.map((student) => <option key={student.id} value={student.id} disabled={isNew && tutoringStatusFor(student) === 'ended'}>{student.nickname || student.name}{tutoringStatusFor(student) === 'ended' ? '（已结课）' : ''}</option>)}</select></label>
          <div className="lesson-priority-grid">
            <fieldset className="priority-time-field">
              <legend><FieldLabel required>上课时间</FieldLabel></legend>
              <div><input required aria-label="开始时间" type="time" value={draft.startTime} onChange={(event) => { const startTime = event.target.value; onChange({ ...draft, startTime, duration: durationFromTimes(startTime, draft.endTime, draft.duration) }); }} /><i aria-hidden="true">至</i><input required aria-label="结束时间" type="time" value={draft.endTime} onChange={(event) => { const endTime = event.target.value; onChange({ ...draft, endTime, duration: durationFromTimes(draft.startTime, endTime, draft.duration) }); }} /></div>
            </fieldset>
            <label className="priority-fee-field"><FieldLabel required>本次报价</FieldLabel><div><span aria-hidden="true">¥</span><input required aria-label="本次报价（元）" type="number" inputMode="decimal" min="0" value={draft.fee} onChange={(event) => onChange({ ...draft, fee: Number(event.target.value) })} /></div></label>
          </div>
          {!isWeekly && <label className="lesson-date-field"><FieldLabel required>上课日期</FieldLabel><input required type="date" value={draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value })} /></label>}
          {isWeekly && <>
            <div className="date-range-grid" aria-label="重复日期区间">
              <label><FieldLabel required>开始日期</FieldLabel><input required type="date" value={draft.repeatStart || draft.date} onChange={(event) => onChange({ ...draft, date: event.target.value, repeatStart: event.target.value })} /></label>
              <i aria-hidden="true">至</i>
              <label><FieldLabel required>结束日期</FieldLabel><input required type="date" value={draft.repeatEnd || draft.date} onChange={(event) => onChange({ ...draft, repeatEnd: event.target.value })} /></label>
            </div>
            <fieldset className="weekday-picker" aria-required="true"><legend><FieldLabel required>每周上课日</FieldLabel></legend><div>{weekDays.map((day, index) => {
              const value = index + 1;
              const selected = (draft.repeatWeekdays || []).includes(value);
              return <button type="button" key={day} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => onChange({ ...draft, repeatWeekdays: selected ? (draft.repeatWeekdays || []).filter((item) => item !== value) : [...(draft.repeatWeekdays || []), value].sort() })}><small>周</small>{day}<Check size={13} aria-hidden="true" /></button>;
            })}</div></fieldset>
            <p className="repeat-summary"><Repeat2 size={14} aria-hidden="true" />授课周期内将生成 <strong>{repeatDates.length}</strong> 节课；超出开始或结课日期的课程会自动跳过。</p>
          </>}
          <div className="lesson-meta-grid">
            <label><FieldLabel required>科目</FieldLabel><select required value={draft.subject} onChange={(event) => onChange({ ...draft, subject: event.target.value as Subject })}>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
            <label><FieldLabel required>状态</FieldLabel><select required value={draft.status} onChange={(event) => onChange({ ...draft, status: event.target.value as LessonStatus })}>{statusOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><FieldLabel>收款状态</FieldLabel><select value={draft.payment} onChange={(event) => onChange({ ...draft, payment: event.target.value as Payment })}><option>待收款</option><option>已收款</option></select></label>
          </div>
          {scheduleError && <p className="schedule-error" role="alert">{scheduleError}</p>}
        </section>

        <section className="form-section work-cost-section">
          <div className="form-section-heading"><span><CircleDollarSign size={17} aria-hidden="true" /></span><div><strong>真实投入与成本</strong><small>自动带入学生默认值，本节课仍可单独调整</small></div></div>
          <div className="form-grid two work-cost-grid">
            <label><span>单程通勤（分钟）</span><input type="number" inputMode="numeric" min="0" value={draft.commuteMinutes || ''} onChange={(event) => onChange({ ...draft, commuteMinutes: Number(event.target.value) })} placeholder="0" /></label>
            <label><span>往返通勤费用（元）</span><input type="number" inputMode="decimal" min="0" step="0.01" value={draft.commuteCost || ''} onChange={(event) => onChange({ ...draft, commuteCost: Number(event.target.value) })} placeholder="0" /></label>
            <label><span>备课时间（分钟）</span><input type="number" inputMode="numeric" min="0" value={draft.preparationMinutes || ''} onChange={(event) => onChange({ ...draft, preparationMinutes: Number(event.target.value) })} placeholder="0" /></label>
            <label><span>课后善后（分钟）</span><input type="number" inputMode="numeric" min="0" value={draft.wrapUpMinutes || ''} onChange={(event) => onChange({ ...draft, wrapUpMinutes: Number(event.target.value) })} placeholder="0" /></label>
          </div>
          <div className="effective-rate-preview" aria-live="polite">
            <div><span>全部投入</span><strong>{Math.round(costBreakdown.workMinutes)} 分钟</strong></div>
            <i aria-hidden="true" />
            <div><span>扣通勤后</span><strong>{cnMoney.format(costBreakdown.netIncome)}</strong></div>
            <i aria-hidden="true" />
            <div className="highlight"><span>真实时薪</span><strong>{cnMoney.format(costBreakdown.effectiveHourly)}/h</strong></div>
          </div>
          <p className="cost-helper">通勤按往返计算；如果本节课线上进行，可将通勤时间和费用设为 0。</p>
        </section>

        <section className="form-section">
          <div className="form-section-heading"><span><BookOpen size={17} aria-hidden="true" /></span><div><strong>课堂记录</strong><small>完成课程后再补充也可以</small></div></div>
          <label className="field first-field"><span>今天教了什么</span><textarea value={draft.teachingContent} onChange={(event) => onChange({ ...draft, teachingContent: event.target.value })} placeholder="分数乘除法、应用题、错题订正…" /></label>
          <section className="mastery-records" aria-labelledby="mastery-records-title">
            <div className="mastery-records-heading"><div><span className="field-title" id="mastery-records-title">掌握情况</span><small>三栏可以同时填写</small></div></div>
            <label className="mastery-record mastered"><span><i />已掌握了什么</span><textarea value={legacyMasteryText(draft, '已掌握')} onChange={(event) => updateMastery('masteredWhat', event.target.value)} placeholder="例如：分数乘法步骤、基础约分…" /></label>
            <label className="mastery-record practice"><span><i />需要巩固什么</span><textarea value={legacyMasteryText(draft, '需要巩固')} onChange={(event) => updateMastery('needsPracticeWhat', event.target.value)} placeholder="例如：多条件应用题、单位换算…" /></label>
            <label className="mastery-record not-mastered"><span><i />还未掌握什么</span><textarea value={legacyMasteryText(draft, '未掌握')} onChange={(event) => updateMastery('notMasteredWhat', event.target.value)} placeholder="例如：不规则动词变化、题意判断…" /></label>
          </section>
          <div className="lesson-note-grid">
            <label><span>课堂表现</span><textarea value={draft.performance} onChange={(event) => onChange({ ...draft, performance: event.target.value })} placeholder="专注度、状态、课堂互动…" /></label>
            <label><span>本次作业</span><textarea value={draft.homework} onChange={(event) => onChange({ ...draft, homework: event.target.value })} placeholder="需要完成的练习" /></label>
            <label><span>下次继续</span><textarea value={draft.nextPlan} onChange={(event) => onChange({ ...draft, nextPlan: event.target.value })} placeholder="下节课打开就能看见的教学提醒" /></label>
            <label><span>私人备注</span><textarea value={draft.privateNotes} onChange={(event) => onChange({ ...draft, privateNotes: event.target.value })} /></label>
          </div>
          <div className="photo-section"><div className="field-label"><span>课堂照片</span><small>自动压缩并保存在本机</small></div><div className="photo-grid">{draft.photos.map((photo, index) => <div className="photo-thumb" key={`${photo.slice(-12)}-${index}`}><img src={photo} alt={`课程附件 ${index + 1}`} /><button onClick={() => onChange({ ...draft, photos: draft.photos.filter((_, item) => item !== index) })} aria-label={`删除附件 ${index + 1}`}><X size={14} /></button></div>)}<button className="photo-add" onClick={() => fileRef.current?.click()}><Camera size={20} /><span>添加照片</span></button></div><input ref={fileRef} hidden type="file" multiple accept="image/*" onChange={(event) => addPhotos(event.target.files)} /></div>
        </section>
      </div>
      <footer className="sheet-footer">{!isNew && <button className="danger-button" onClick={onDelete} aria-label="删除课程"><Trash2 size={18} /></button>}{isWeekly ? <><button className="secondary-button grow" onClick={onClose}>取消</button><button className="primary-button grow" onClick={() => submitLesson(false)}><Repeat2 size={17} />生成课程</button></> : <><button className="secondary-button grow" onClick={() => submitLesson(false)}>保存</button><button className="primary-button grow" onClick={() => submitLesson(true)}><Check size={18} />完成课程</button></>}</footer>
    </section>
  </div>;
}

function ArchivePinDialog({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  const [settingPin] = useState(() => !localStorage.getItem(ARCHIVE_PIN_KEY));
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) { setError('请输入 4 位数字密码。'); return; }
    if (settingPin && pin !== confirmPin) { setError('两次输入的密码不一致。'); return; }
    setChecking(true);
    const value = await hashPin(pin);
    if (settingPin) {
      localStorage.setItem(ARCHIVE_PIN_KEY, value);
      onUnlock();
    } else if (value === localStorage.getItem(ARCHIVE_PIN_KEY)) {
      onUnlock();
    } else {
      setError('密码不正确，请再试一次。');
    }
    setChecking(false);
  }

  return <div className="sheet-layer centered" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="pin-dialog" role="dialog" aria-modal="true" aria-labelledby="pin-title" onSubmit={submit}>
      <div className="pin-dialog-icon"><LockKeyhole size={22} aria-hidden="true" /></div>
      <div><p className="eyebrow">Private archive</p><h2 id="pin-title">{settingPin ? '设置档案密码' : '解锁私密档案'}</h2><p>{settingPin ? '设置一个本机 4 位数字密码。之后每次刷新页面，私密档案都会重新锁定。' : '输入你设置的 4 位密码，查看学生与家长的私密评价。'}</p></div>
      <label><span>4 位数字密码</span><input autoFocus type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} /></label>
      {settingPin && <label><span>再次输入</span><input type="password" inputMode="numeric" autoComplete="off" maxLength={4} value={confirmPin} onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 4))} /></label>}
      {error && <p className="pin-error" role="alert">{error}</p>}
      <div className="pin-actions"><button type="button" className="secondary-button" onClick={onClose}>取消</button><button className="primary-button" disabled={checking}>{checking ? '正在验证…' : settingPin ? '设置并解锁' : '解锁档案'}</button></div>
      <small>密码只保存在当前设备。请妥善记住；清除浏览器数据会同时清除档案内容与密码。</small>
    </form>
  </div>;
}

function StudentEditor({ draft, onChange, onClose, onSave }: { draft: Student; onChange: (student: Student) => void; onClose: () => void; onSave: () => void }) {
  const startTime = draft.defaultStartTime || '16:00';
  const endTime = draft.defaultEndTime || '17:30';
  const duration = durationFromTimes(startTime, endTime, draft.defaultDuration || 90);
  const hourlyRate = Math.max(0, studentHourlyRate(draft));
  const quotedFee = hourlyRate * duration / 60;
  const workMinutes = duration + Math.max(0, draft.commuteMinutes || 0) * 2 + Math.max(0, draft.preparationMinutes || 0) + Math.max(0, draft.wrapUpMinutes || 0);
  const netIncome = quotedFee - Math.max(0, draft.commuteCost || 0);
  const effectiveHourly = workMinutes ? netIncome / (workMinutes / 60) : 0;
  const scheduleCount = draft.autoScheduleEnabled ? scheduledLessonsForStudent({ ...draft, defaultStartTime: startTime, defaultEndTime: endTime, defaultDuration: duration, defaultFee: quotedFee, defaultHourlyRate: hourlyRate }).length : 0;
  const invalidTime = endTime <= startTime;
  const missingWeekday = Boolean(draft.autoScheduleEnabled && !(draft.defaultWeekdays || []).length);
  const invalidPeriod = Boolean(draft.tutoringStartDate && draft.tutoringEndDate && draft.tutoringEndDate < draft.tutoringStartDate);
  const canSave = Boolean(draft.name.trim() && hourlyRate > 0 && !invalidTime && !missingWeekday && !invalidPeriod);
  return <div className="sheet-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="sheet compact-sheet" role="dialog" aria-modal="true" aria-labelledby="student-title"><div className="sheet-handle" /><header className="sheet-header"><div><p className="eyebrow">Student profile</p><h2 id="student-title">学生档案</h2></div><IconButton label="关闭" onClick={onClose}><X size={20} /></IconButton></header>
    <div className="sheet-content">
      <section className="form-section">
        <div className="form-section-heading"><span><Users size={17} aria-hidden="true" /></span><div><strong>基本资料</strong><small>姓名、学校与联系方式</small></div></div>
        <p className="required-legend"><b aria-hidden="true">*</b> 为必填项，其余档案可以之后补充</p>
        <div className="form-grid two student-basic-grid">
          <label><FieldLabel required>姓名</FieldLabel><input required value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} placeholder="学生姓名" /></label>
          <label><span>昵称</span><input value={draft.nickname} onChange={(event) => onChange({ ...draft, nickname: event.target.value })} placeholder="日常称呼" /></label>
          <label><span>年级</span><input value={draft.grade} onChange={(event) => onChange({ ...draft, grade: event.target.value })} /></label>
          <label><span>学校</span><input value={draft.school} onChange={(event) => onChange({ ...draft, school: event.target.value })} /></label>
          <label><span>家长姓名</span><input value={draft.parentName} onChange={(event) => onChange({ ...draft, parentName: event.target.value })} /></label>
          <label><span>家长电话</span><input inputMode="tel" value={draft.parentPhone} onChange={(event) => onChange({ ...draft, parentPhone: event.target.value })} /></label>
        </div>
      </section>
      <section className="form-section student-pay-section">
        <div className="form-section-heading"><span><CircleDollarSign size={17} aria-hidden="true" /></span><div><strong>常用上课与计薪</strong><small>上课时间和时薪优先；保存后可直接同步首页课表</small></div></div>
        <div className="student-priority-grid">
          <fieldset className="priority-time-field">
            <legend><FieldLabel required>常用上课时间</FieldLabel></legend>
            <div><input required aria-label="常用开始时间" type="time" value={startTime} onChange={(event) => {
              const nextStart = event.target.value;
              const nextDuration = durationFromTimes(nextStart, endTime, duration);
              onChange({ ...draft, defaultStartTime: nextStart, defaultDuration: nextDuration, defaultFee: hourlyRate * nextDuration / 60 });
            }} /><i aria-hidden="true">至</i><input required aria-label="常用结束时间" type="time" value={endTime} onChange={(event) => {
              const nextEnd = event.target.value;
              const nextDuration = durationFromTimes(startTime, nextEnd, duration);
              onChange({ ...draft, defaultEndTime: nextEnd, defaultDuration: nextDuration, defaultFee: hourlyRate * nextDuration / 60 });
            }} /></div>
          </fieldset>
          <label className="priority-hourly-field"><FieldLabel required>报价时薪</FieldLabel><div><span aria-hidden="true">¥</span><input required aria-label="报价时薪（元每小时）" type="number" inputMode="decimal" min="0" step="0.01" value={hourlyRate || ''} onChange={(event) => {
            const rate = Number(event.target.value);
            onChange({ ...draft, defaultHourlyRate: rate, defaultFee: rate * duration / 60 });
          }} /></div></label>
        </div>
        <fieldset className="weekday-picker student-weekdays"><legend>常用上课日</legend><div>{weekDays.map((day, index) => {
          const value = index + 1;
          const selected = (draft.defaultWeekdays || []).includes(value);
          return <button type="button" key={day} className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => onChange({ ...draft, defaultWeekdays: selected ? (draft.defaultWeekdays || []).filter((item) => item !== value) : [...(draft.defaultWeekdays || []), value].sort() })}><small>周</small>{day}<Check size={13} aria-hidden="true" /></button>;
        })}</div></fieldset>
        <button type="button" className={`auto-schedule-toggle ${draft.autoScheduleEnabled ? 'selected' : ''}`} aria-pressed={Boolean(draft.autoScheduleEnabled)} onClick={() => onChange({ ...draft, autoScheduleEnabled: !draft.autoScheduleEnabled })}>
          <span><CalendarDays size={17} aria-hidden="true" /></span><div><strong>保存学生后同步到首页课表</strong><small>{draft.autoScheduleEnabled ? `预计生成 ${scheduleCount} 节预约课${draft.tutoringEndDate ? '' : '（先排未来 6 个月）'}` : '关闭时只保存学生资料，不自动排课'}</small></div><i aria-hidden="true"><b /></i>
        </button>
        <div className="form-grid two work-cost-grid student-cost-grid">
          <label><span>单程通勤（分钟）</span><input type="number" inputMode="numeric" min="0" value={draft.commuteMinutes || ''} onChange={(event) => onChange({ ...draft, commuteMinutes: Number(event.target.value) })} placeholder="0" /></label>
          <label><span>往返通勤费用（元）</span><input type="number" inputMode="decimal" min="0" step="0.01" value={draft.commuteCost || ''} onChange={(event) => onChange({ ...draft, commuteCost: Number(event.target.value) })} placeholder="0" /></label>
          <label><span>每次备课（分钟）</span><input type="number" inputMode="numeric" min="0" value={draft.preparationMinutes || ''} onChange={(event) => onChange({ ...draft, preparationMinutes: Number(event.target.value) })} placeholder="0" /></label>
          <label><span>每次善后（分钟）</span><input type="number" inputMode="numeric" min="0" value={draft.wrapUpMinutes || ''} onChange={(event) => onChange({ ...draft, wrapUpMinutes: Number(event.target.value) })} placeholder="0" /></label>
        </div>
        <div className="effective-rate-preview student-rate-preview" aria-live="polite">
          <div><span>单次报价</span><strong>{cnMoney.format(quotedFee)}</strong></div><i aria-hidden="true" /><div><span>全部投入</span><strong>{workMinutes} 分钟</strong></div><i aria-hidden="true" /><div className="highlight"><span>真实时薪</span><strong>{cnMoney.format(effectiveHourly)}/h</strong></div>
        </div>
        <p className="cost-helper">真实时薪会扣除往返通勤费用，并计入往返通勤、备课和善后时间。</p>
        {invalidTime && <p className="schedule-error" role="alert">结束时间需要晚于开始时间。</p>}
        {missingWeekday && <p className="schedule-error" role="alert">要同步首页课表，请至少选择一个常用上课日。</p>}
      </section>
      <section className="form-section">
        <div className="form-section-heading"><span><CalendarRange size={17} aria-hidden="true" /></span><div><strong>授课状态与周期</strong><small>用于区分当前学生，并限制每周自动排课</small></div></div>
        <fieldset className="tutoring-status-field"><legend>授课状态</legend><div className="tutoring-status-switch" role="group" aria-label="授课状态">
          <button type="button" className={tutoringStatusFor(draft) === 'active' ? 'selected active' : ''} aria-pressed={tutoringStatusFor(draft) === 'active'} onClick={() => onChange({ ...draft, tutoringStatus: 'active', tutoringEndDate: draft.tutoringEndDate && draft.tutoringEndDate >= demoToday ? draft.tutoringEndDate : '' })}><span />正在授课</button>
          <button type="button" className={tutoringStatusFor(draft) === 'ended' ? 'selected ended' : ''} aria-pressed={tutoringStatusFor(draft) === 'ended'} onClick={() => onChange({ ...draft, tutoringStatus: 'ended', tutoringEndDate: draft.tutoringEndDate || demoToday })}><span />已结课</button>
        </div></fieldset>
        <div className="form-grid two tutoring-date-grid">
          <label><span>开始授课日期</span><input type="date" value={draft.tutoringStartDate || ''} onChange={(event) => onChange({ ...draft, tutoringStartDate: event.target.value })} /></label>
          <label><span>结课日期（可选）</span><input type="date" min={draft.tutoringStartDate || undefined} value={draft.tutoringEndDate || ''} onChange={(event) => onChange({ ...draft, tutoringEndDate: event.target.value, tutoringStatus: event.target.value && event.target.value < demoToday ? 'ended' : draft.tutoringStatus })} /></label>
        </div>
        <p className="tutoring-period-hint">每周重复课程只会生成在这个日期区间内；已结课学生不会被默认选入新的排课。</p>
        {invalidPeriod && <p className="schedule-error" role="alert">结课日期不能早于开始授课日期。</p>}
      </section>
      <section className="form-section">
        <div className="form-section-heading"><span><MapPin size={17} aria-hidden="true" /></span><div><strong>上课地点</strong><small>课表只显示简称，详细地址留在档案内</small></div></div>
        <div className="form-grid">
          <label><span>课表地点简称</span><input maxLength={10} value={draft.locationShort || ''} onChange={(event) => onChange({ ...draft, locationShort: event.target.value })} placeholder="如：徐家汇、学生家" /></label>
        </div>
        <label className="field"><span>详细地址</span><textarea value={draft.fullAddress || ''} onChange={(event) => onChange({ ...draft, fullAddress: event.target.value })} placeholder="仅在学生资料中展示，不显示在课表上" /></label>
      </section>
      <section className="form-section">
        <div className="form-section-heading"><span><Palette size={17} aria-hidden="true" /></span><div><strong>课表识别</strong><small>设置学生颜色与所教学科</small></div></div>
        <fieldset className="color-field first-field"><legend>学生专属颜色</legend><div className="color-picker-row"><div className="color-swatches" role="group" aria-label="常用颜色">{studentColorPalette.map((color) => <button type="button" key={color} className={(draft.color || studentColorPalette[0]) === color ? 'selected' : ''} style={{ backgroundColor: color, color: contrastText(color) }} onClick={() => onChange({ ...draft, color })} aria-label={`选择颜色 ${color}`} aria-pressed={(draft.color || studentColorPalette[0]) === color}><Check size={14} aria-hidden="true" /></button>)}</div><label className="custom-color"><Palette size={16} aria-hidden="true" /><span>自选</span><input type="color" value={draft.color || studentColorPalette[0]} onChange={(event) => onChange({ ...draft, color: event.target.value })} aria-label="自定义学生颜色" /></label></div><small>会用于头像、月历标记和周课表课程卡。</small></fieldset>
        <fieldset className="subject-field"><legend>所教学科</legend><div>{subjects.map((subject) => <button type="button" key={subject} className={draft.subjects.includes(subject) ? 'selected' : ''} onClick={() => onChange({ ...draft, subjects: draft.subjects.includes(subject) ? draft.subjects.filter((item) => item !== subject) : [...draft.subjects, subject] })}>{subject}</button>)}</div></fieldset>
        <label className="field"><span>教学提醒</span><textarea value={draft.notes} onChange={(event) => onChange({ ...draft, notes: event.target.value })} placeholder="长期关注点、学习习惯…" /></label>
      </section>
    </div>
    <footer className="sheet-footer"><button className="secondary-button grow" onClick={onClose}>取消</button><button className="primary-button grow" onClick={onSave} disabled={!canSave}><Check size={18} />保存学生</button></footer>
  </section></div>;
}
