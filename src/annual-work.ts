const departmentWork = [
  {
    projects:['Improve stock accuracy','Reduce late deliveries'],
    entries:[
      ['2026-03-12',0,'Compared system counts with physical inventory and grouped discrepancies by product code.'],
      ['2026-06-18',0,'Piloted weekly counts for top-selling items and logged stock adjustments.'],
      ['2026-09-24',1,'Tested product-code checks before packing and prioritized urgent orders by dispatch slot.'],
      ['2026-11-12',1,'Reviewed late deliveries and identified changes to the dispatch schedule.'],
    ],
  },
  {
    projects:['Improve order intake','Repeat customer campaign'],
    entries:[
      ['2026-03-16',0,'Collected reasons customers changed orders after confirmation.'],
      ['2026-06-15',0,'Tested an order checklist before handing orders to the warehouse.'],
      ['2026-09-22',1,'Grouped existing customers for a post-sale follow-up pilot.'],
      ['2026-11-16',1,'Summarized repeat sales and recorded common customer questions.'],
    ],
  },
  {
    projects:['Standardize documentation','Reduce rework before closing'],
    entries:[
      ['2026-03-10',0,'Listed document types and identified where a second check was needed.'],
      ['2026-06-18',0,'Piloted shared document templates for purchasing and sales.'],
      ['2026-09-23',1,'Added a pre-submission checklist and tracked documents that needed fixes.'],
      ['2026-11-17',1,'Reviewed prior errors and updated the checklist.'],
    ],
  },
] as const;

export function sampleAnnualWork(department:number){
  const work=departmentWork[department];
  if(!work)return [];
  return work.entries.map(([observed,projectIndex,description])=>({observed,project:work.projects[projectIndex],description}));
}
