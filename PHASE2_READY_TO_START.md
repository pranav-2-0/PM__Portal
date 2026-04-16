# Phase 2 Refactoring: Feature Extraction (Ready to Start)

## Overview

After Phase 1's successful foundation, Phase 2 will extract feature-specific components from `People.tsx` into isolated, reusable feature modules.

**Timeline:** 4-6 hours (1-2 hours per major feature)  
**Approach:** Incremental, non-breaking extractions  
**Result:** People.tsx becomes a clean 50-line router component

---

## Phase 2 Tasks (Ready to Execute)

### 📋 Master Checklist

- [x] **Task 2.1:** Extract `features/employees/` (All Employees tab) ✅ COMPLETED
- [ ] **Task 2.2:** Extract `features/bench/` (Bench Resources tab)
- [ ] **Task 2.3:** Extract `features/newJoiners/` (New Joiners tab with PM modal)
- [ ] **Task 2.4:** Extract `features/separations/` (Separations tab)
- [ ] **Task 2.5:** Extract `features/skills/` (Skill Management panel)
- [ ] **Task 2.6:** Refactor People.tsx → Hub router
- [ ] **Task 2.7:** Final integration testing

---

## Detailed Breakdown

### Task 2.1: Extract `features/employees/`

**Folder Structure:**
```
src/features/employees/
├── components/
│   ├── EmployeeTable.tsx        (from People.tsx EmployeeTable section)
│   ├── EmployeeFilters.tsx      (NEW - extracted filter UI)
│   └── EmployeeSummary.tsx      (NEW - stat cards)
├── hooks/
│   ├── useEmployeeList.ts       (NEW - data fetching logic)
│   └── useEmployeeExport.ts     (NEW - CSV export wrapper)
├── constants/
│   └── index.ts                 (NEW - employee-specific constants)
├── types/
│   └── index.ts                 (NEW - employee types if needed)
└── pages/
    └── Employees.tsx            (NEW - main page component)
```

**Work Items:**
1. Create folder structure
2. Extract EmployeeTable component (move from People.tsx)
3. Extract filter state into useEmployeeList hook
4. Create EmployeeFilters sub-component
5. Create useEmployeeExport hook (wraps exportToCSV)
6. Move constants from matchingConstants.ts (if employee-specific)
7. Create Employees.tsx page wrapper
8. Update imports in People.tsx

**Time Estimate:** 1-1.5 hours

---

### Task 2.2: Extract `features/bench/`

**Folder Structure:**
```
src/features/bench/
├── components/
│   ├── BenchTable.tsx           (from People.tsx EmployeeTable[benchOnly])
│   ├── BenchFilters.tsx         (NEW)
│   └── BenchSummary.tsx         (NEW - grade summary cards)
├── hooks/
│   └── useBenchList.ts          (NEW)
├── constants/
│   └── index.ts                 (NEW)
└── pages/
    └── Bench.tsx                (NEW)
```

**Work Items:**
1. Create folder structure
2. Extract BenchTable component (split from EmployeeTable)
3. Extract bench-specific filtering logic
4. Create BenchSummary component for stat cards
5. Create Bench.tsx page
6. Update imports

**Time Estimate:** 0.75-1 hour  
**Note:** Simpler than employees, can be done quickly

---

### Task 2.3: Extract `features/newJoiners/`

**Folder Structure:**
```
src/features/newJoiners/
├── components/
│   ├── NewJoinersTable.tsx          (from People.tsx)
│   ├── PMRecommendationModal.tsx    (split from People.tsx modal)
│   ├── PMMatchCard.tsx              (NEW - extracted from modal)
│   ├── PreApprovalPreview.tsx       (NEW - extracted from modal)
│   ├── FlagRenderer.tsx             (NEW - flag display logic)
│   └── DatasetScopeWarning.tsx      (NEW)
├── hooks/
│   ├── useNewJoiners.ts            (NEW - list fetching)
│   ├── usePMMatching.ts            (NEW - PM recommendation logic)
│   └── usePMAssignment.ts          (NEW - assignment logic)
├── constants/
│   └── index.ts                    (NEW - PM matching labels & colors)
├── types/
│   └── index.ts                    (NEW - PMMatch, Flag types, etc.)
└── pages/
    └── NewJoiners.tsx              (NEW)
```

**Work Items:**
1. Create folder structure
2. Extract NewJoinersTable component
3. Split large PMRecommendationModal into 5 focused components
4. Extract PM matching logic into usePMMatching hook
5. Extract assignment flow into usePMAssignment hook
6. Extract constants (FLAG_COLORS, CONFIDENCE_COLORS, PATH_LABELS already in shared - add newJoiner-specific ones)
7. Create NewJoiners.tsx page
8. Update imports

**Time Estimate:** 1.5-2 hours  
**Complexity:** Highest - largest component extraction

---

### Task 2.4: Extract `features/separations/`

**Folder Structure:**
```
src/features/separations/
├── components/
│   ├── SeparationsTable.tsx     (from People.tsx)
│   ├── UrgentAlert.tsx          (NEW - "within 30 days" banner)
│   └── SeparationFilters.tsx    (NEW)
├── hooks/
│   └── useSeparations.ts        (NEW)
├── constants/
│   └── index.ts                 (NEW - SEP_TYPE_BADGE, PERSON_TYPE_BADGE moved here)
├── types/
│   └── index.ts                 (NEW)
├── utils/
│   └── separationHelpers.ts     (NEW - if needed)
└── pages/
    └── Separations.tsx          (NEW)
```

**Work Items:**
1. Create folder structure
2. Extract SeparationsTable component
3. Extract urgent banner into UrgentAlert
4. Create SeparationFilters component
5. Move separation badge constants here
6. Create useSeparations hook
7. Create Separations.tsx page
8. Update imports in People.tsx and shared constants

**Time Estimate:** 1-1.25 hours

---

### Task 2.5: Extract `features/skills/`

**Folder Structure:**
```
src/features/skills/
├── components/
│   ├── SkillPanel.tsx               (main wrapper from People.tsx)
│   ├── SkillUpdateForm.tsx          (NEW - extracted section)
│   ├── SkillRemoveForm.tsx          (NEW - extracted section)
│   ├── SkillGroupSection.tsx        (NEW - skill-wise view)
│   ├── SkillViewToggle.tsx          (NEW - List/Skill-wise toggle)
│   ├── CoverageSummary.tsx          (NEW - stats card)
│   ├── UpdateResultModal.tsx        (NEW - success modal)
│   └── SkillSearchBox.tsx           (NEW - search inputs)
├── hooks/
│   ├── useSkillManagement.ts        (NEW - main logic)
│   ├── useSkillGroups.ts            (NEW - grouping & filtering)
│   └── useBulkSkillUpdate.ts        (NEW - mutation wrapper)
├── utils/
│   └── skillFormatters.ts           (NEW - normalizeSkill here too)
├── constants/
│   └── index.ts                     (NEW - skill-specific constants)
├── types/
│   └── index.ts                     (NEW)
└── pages/
    └── SkillManagement.tsx          (if standalone, else just components)
```

**Work Items:**
1. Create folder structure
2. Extract entire SkillPanel into components
3. Split into 7 focused sub-components
4. Extract skill grouping logic into useSkillGroups
5. Extract update/remove logic into hooks
6. Move normalizeSkill to skill feature utils
7. Create skill-specific constants
8. Create UpdateResultModal component
9. Create SkillManagement.tsx wrapper
10. Update imports

**Time Estimate:** 1.5-2 hours  
**Complexity:** High - complex state management

---

### Task 2.6: Refactor People.tsx → Hub Router

**Current State:**
- 2,924 lines with 4 tabs + skill panel

**Target State:**
```tsx
// src/pages/People.tsx (50 lines)
import TabBar from '../components/TabBar';
import { useState } from 'react';
import { PEOPLE_TABS, TAB_TITLES } from '../shared/constants';

// Feature imports
import Employees from '../features/employees/pages/Employees';
import BenchResources from '../features/bench/pages/Bench';
import NewJoiners from '../features/newJoiners/pages/NewJoiners';
import Separations from '../features/separations/pages/Separations';

type TabId = 'employees' | 'bench' | 'new-joiners' | 'separations';

export default function People({ defaultTab }: { defaultTab?: TabId }) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab || 'employees');
  const { title } = TAB_TITLES[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
      </div>
      <TabBar tabs={PEOPLE_TABS} active={activeTab} onChange={t => setActiveTab(t as any)} />

      {activeTab === 'employees' && <Employees />}
      {activeTab === 'bench' && <BenchResources />}
      {activeTab === 'new-joiners' && <NewJoiners />}
      {activeTab === 'separations' && <Separations />}
    </div>
  );
}
```

**Work Items:**
1. Delete all extracted component code from People.tsx
2. Add feature page imports
3. Update render logic to use feature components
4. Verify props/state pass-through correctly
5. Test all tab navigation
6. Clean up unused imports

**Time Estimate:** 30 min - 1 hour

---

### Task 2.7: Integration Testing

**Checklist:**
- [ ] All tabs display correctly
- [ ] Filtering works in each tab
- [ ] Pagination works correctly
- [ ] CSV export works from each tab
- [ ] PM matching modal opens/closes
- [ ] Skill updates work
- [ ] Navigation between tabs smooth
- [ ] No console errors
- [ ] Build completes successfully
- [ ] All TypeScript strict mode checks pass

**Time Estimate:** 30 min

---

## Execution Strategy

### Option A: Sequential (Recommended for First-Time)
1. Do Task 2.1 (Employees) - learn the pattern
2. Do Task 2.2 (Bench) - apply pattern, faster
3. Do Task 2.3 (NewJoiners) - harder, but you're experienced
4. Do Task 2.4 (Separations) - straightforward
5. Do Task 2.5 (Skills) - most complex, you'll be ready
6. Do Task 2.6 (People hub)
7. Do Task 2.7 (Testing)

**Timeline:** 5-6 hours total

### Option B: Parallel (If Comfortable)
1. Do 2.1 + 2.2 together (both simple list views)
2. Do 2.4 + 2.1 follow-up (separations straightforward)
3. Do 2.3 (newJoiners - hardest, full attention)
4. Do 2.5 (skills - last, you'll be a pro)
5. Do 2.6 (refactor People)
6. Do 2.7 (testing)

---

## Files Reference

### People.tsx Current Sections (to extract)
- Lines 1-50: Imports & constants (remove, use shared)
- Lines 75-500: EmployeeTable function (→ features/employees)
- Lines 500-800: NewJoiners function (→ features/newJoiners)
- Lines 800-1200: Separations function (→ features/separations)
- Lines 1200-2800: Skill management (→ features/skills)
- Lines 2800-2924: Main People component (→ hub)

---

## Success Criteria

### ✅ After Phase 2 Complete
- [ ] Zero TypeScript errors
- [ ] All functionality identical
- [ ] People.tsx < 100 lines
- [ ] 5 focused feature folders
- [ ] Each feature has: components/, hooks/, constants/, pages/
- [ ] All hooks are typed
- [ ] All components have JSDoc
- [ ] README updated with new structure
- [ ] All tests pass
- [ ] Build succeeds

---

## Notes

### Dependencies
- Shared Phase 1 files: ✅ Already available
- No new packages needed
- All existing RTK Query endpoints stay in `pmApi.ts`

### Safety
- Each task is independent and non-breaking
- Can pause between tasks
- Each feature remains fully functional
- People.tsx always works at any point in the process

### Next After Phase 2
- **Phase 3 (Optional):** Redux slices for feature state
- **Phase 4 (Optional):** Advanced routing structure
- **Phase 5 (Optional):** Component-level testing

---

## When Ready

Just let me know and we'll execute Phase 2 step-by-step! Each task is independent and fully documented.
