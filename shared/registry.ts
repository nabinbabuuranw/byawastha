// Byawastha module registry: every management system the platform knows, in one compact source.
// Line format (see docs/MODULE_ENGINE.md):
//   #categoryKey|Category name|description|PhosphorIcon|tagline
//   moduleKey|Module name|description|entity;entity...
//   entity  = key:Name[field,field,...]
//   field   = key[*][:type]   type = text|long|num|money|date|dt|email|phone|url|bool|sel(A/B/C)|ref(entityKey)   (* = required)
export type FieldType = 'text' | 'long' | 'num' | 'money' | 'date' | 'dt' | 'email' | 'phone' | 'url' | 'bool' | 'sel' | 'ref';
export interface Field { key: string; label: string; type: FieldType; required: boolean; options?: string[]; ref?: string }
export interface Entity { key: string; name: string; fields: Field[]; titleField: string; statusField: string | null; moneyField: string | null; dateField: string | null }
export interface ModuleDef { key: string; name: string; category: string; description: string; entities: Entity[]; tier: 'standard' }
export interface Category { key: string; name: string; description: string; icon: string; tagline: string; modules: string[] }

export const REGISTRY_SRC = `#edu|Education|Schools, colleges, tuition and learning|GraduationCap|Learn, teach and run campuses
school|School Management|Students, classes and staff for a K-12 school|student:Student[name*,admission_no*,class,section,guardian_name,guardian_phone:phone,dob:date,status:sel(Active/Alumni/Left)];klass:Class[name*,class_teacher,room,capacity:num];staff:Staff[name*,role:sel(Teacher/Admin/Support),phone:phone,joined:date]
college|College Management|Programs, batches and students of a college|program:Program[name*,faculty,duration_years:num,seats:num];student:Student[name*,roll_no*,program:ref(program),batch,phone:phone,status:sel(Enrolled/Graduated/Dropped)]
university|University Management|Faculties, departments and affiliated programs|faculty:Faculty[name*,dean,phone:phone];department:Department[name*,faculty:ref(faculty),head,established:date];program:Program[name*,level:sel(Bachelor/Master/PhD/Diploma),department:ref(department),credits:num]
student|Student Management|Student profiles, guardians and status|student:Student[name*,student_id*,grade,email:email,phone:phone,guardian_name,guardian_phone:phone,address,status:sel(Active/On leave/Graduated/Withdrawn)]
teacher|Teacher Management|Teacher profiles, subjects and workload|teacher:Teacher[name*,employee_id,subjects,qualification,phone:phone,email:email,weekly_hours:num,status:sel(Active/On leave/Resigned)]
attendance|Attendance Management|Daily attendance for students or staff|entry:Attendance entry[person*,date:date*,session:sel(Morning/Day/Evening),status:sel(Present/Absent/Late/Excused),note]
exam|Examination Management|Exams, subjects and marks|exam:Exam[name*,term,start_date:date,end_date:date,status:sel(Planned/Running/Published)];mark:Mark[student*,exam:ref(exam),subject*,full_marks:num,obtained:num,grade]
lms|LMS (Learning Management)|Courses, lessons and enrolments|course:Course[title*,instructor,level:sel(Beginner/Intermediate/Advanced),status:sel(Draft/Published/Archived)];lesson:Lesson[title*,course:ref(course),order:num,duration_min:num,video_url:url];enrolment:Enrolment[learner*,course:ref(course),progress_pct:num,status:sel(Active/Completed/Dropped)]
library|Library Management|Books, members and loans|book:Book[title*,author,isbn,category,copies:num,shelf];member:Member[name*,member_no,phone:phone,status:sel(Active/Suspended)];loan:Loan[book:ref(book)*,member:ref(member)*,issued:date,due:date,returned:date,status:sel(Issued/Returned/Overdue/Lost)]
hostel|Hostel Management|Rooms, residents and mess fees|room:Room[number*,block,beds:num,type:sel(Single/Double/Dorm),status:sel(Available/Full/Maintenance)];resident:Resident[name*,room:ref(room),phone:phone,check_in:date,check_out:date,monthly_fee:money]
fee|Fee Management|Fee heads, invoices and collections|head:Fee head[name*,amount:money,frequency:sel(Monthly/Termly/Yearly/One-time)];payment:Fee payment[student*,head:ref(head),amount:money*,paid_on:date,method:sel(Cash/Bank/eSewa/Khalti/Card),receipt_no,status:sel(Paid/Partial/Due)]
admission|Admission Management|Enquiries, applications and decisions|application:Application[applicant*,program,phone:phone,email:email,applied_on:date,entrance_score:num,status:sel(Enquiry/Applied/Interview/Admitted/Rejected)]
tuition|Tuition Center Management|Batches, tutors and fees for coaching centres|batch:Batch[name*,subject,tutor,timing,seats:num,fee:money];learner:Learner[name*,batch:ref(batch),phone:phone,joined:date,status:sel(Active/Paused/Left)]
elearning|E-Learning Management|Online courses, quizzes and certificates|course:Online course[title*,category,price:money,status:sel(Draft/Live/Retired)];quiz:Quiz[title*,course:ref(course),questions:num,pass_pct:num];certificate:Certificate[learner*,course:ref(course),issued:date,code]
course|Course Management|Course catalogue, credits and schedules|course:Course[code*,title*,credits:num,semester,instructor,status:sel(Offered/Not offered)];section:Section[course:ref(course)*,days,time,room,capacity:num]
#biz|Business & Office|ERP, CRM, HR, projects and office work|Briefcase|Run the business and the office
business|Business Management|Branches, goals and key business records|branch:Branch[name*,manager,city,phone:phone,status:sel(Open/Closed)];goal:Goal[title*,owner,target:num,achieved:num,due:date,status:sel(On track/At risk/Done)]
erp|ERP|Items, purchase and sales orders in one place|item:Item[sku*,name*,unit,cost:money,price:money,stock:num];po:Purchase order[number*,supplier,date:date,total:money,status:sel(Draft/Ordered/Received/Cancelled)];so:Sales order[number*,customer,date:date,total:money,status:sel(Draft/Confirmed/Delivered/Cancelled)]
crm|CRM|Leads, contacts and deals pipeline|lead:Lead[name*,company,email:email,phone:phone,source:sel(Website/Referral/Social/Walk-in/Other),status:sel(New/Contacted/Qualified/Lost)];deal:Deal[title*,contact,value:money,stage:sel(Prospect/Proposal/Negotiation/Won/Lost),close_date:date];contact:Contact[name*,company,email:email,phone:phone]
employee|Employee Management|Employee records and documents|employee:Employee[name*,employee_id*,department,designation,email:email,phone:phone,joined:date,status:sel(Active/Probation/Notice/Exited)]
hr|HR Management|Leave, recruitment and reviews|leave:Leave request[employee*,type:sel(Annual/Sick/Unpaid/Other),from:date,to:date,days:num,status:sel(Pending/Approved/Rejected)];review:Performance review[employee*,period,rating:num,reviewer,status:sel(Draft/Submitted/Closed)]
payroll|Payroll Management|Salary runs and payslips|run:Payroll run[period*,pay_date:date,total:money,status:sel(Draft/Approved/Paid)];payslip:Payslip[employee*,run:ref(run),basic:money,allowances:money,deductions:money,net:money]
project|Project Management|Projects, milestones and budgets|project:Project[name*,client,manager,start:date,end:date,budget:money,status:sel(Planned/Active/On hold/Done)];milestone:Milestone[title*,project:ref(project),due:date,status:sel(Open/Done)]
task|Task Management|Team tasks with owners and due dates|task:Task[title*,assignee,priority:sel(Low/Medium/High/Urgent),due:date,status:sel(To do/Doing/Review/Done),notes:long]
team|Team Management|Teams, members and capacity|team:Team[name*,lead,purpose,size:num];member:Team member[name*,team:ref(team),role,capacity_hours:num]
office|Office Management|Rooms, supplies and visitors|room:Meeting room[name*,floor,capacity:num,status:sel(Free/Booked/Out of service)];visitor:Visitor[name*,host,purpose,visit_date:date,in_time,out_time];supply:Supply[name*,qty:num,reorder_at:num]
document|Document Management|Document register with owners and versions|doc:Document[title*,category,owner,version,link:url,expires:date,status:sel(Draft/Active/Archived)]
workflow|Workflow Management|Approval flows and requests|flow:Workflow[name*,trigger,steps:num,status:sel(Active/Paused)];request:Request[title*,workflow:ref(flow),requested_by,amount:money,status:sel(Pending/Approved/Rejected)]
inventory|Inventory Management|Items, stock levels and movements|item:Item[sku*,name*,category,qty:num,unit,reorder_level:num,location];movement:Stock movement[item:ref(item)*,type:sel(In/Out/Adjust),qty:num*,date:date,note]
asset|Asset Management|Company assets, custody and depreciation|asset:Asset[tag*,name*,category,assigned_to,purchase_date:date,cost:money,status:sel(In use/In store/Repair/Disposed)]
appointment|Appointment Management|Bookings for any service desk|appointment:Appointment[client*,service,date:date*,time,staff,phone:phone,status:sel(Booked/Confirmed/Done/No-show/Cancelled)]
#fin|Finance & Accounting|Money in, money out, books and tax|Coins|Keep the books straight
accounting|Accounting|Chart of accounts and journal entries|account:Account[code*,name*,type:sel(Asset/Liability/Equity/Income/Expense),balance:money];journal:Journal entry[date:date*,memo*,debit_account:ref(account),credit_account:ref(account),amount:money*]
financial|Financial Management|Financial plans, forecasts and statements|plan:Financial plan[name*,period,revenue_target:money,cost_target:money,status:sel(Draft/Approved)];statement:Statement[title*,period,type:sel(P&L/Balance sheet/Cash flow),link:url]
expense|Expense Management|Expenses and claims with receipts|expense:Expense[title*,category,amount:money*,date:date,paid_by,vendor,status:sel(Draft/Submitted/Approved/Reimbursed/Rejected)]
income|Income Management|Income streams and receipts|income:Income[source*,category,amount:money*,date:date,received_via:sel(Cash/Bank/eSewa/Khalti/Card/Other)]
budget|Budget Management|Budgets by department and actuals|budget:Budget line[name*,department,period,planned:money,actual:money,status:sel(Under/On track/Over)]
invoice|Invoice Management|Customer invoices and their payment state|invoice:Invoice[number*,customer*,issue_date:date,due_date:date,amount:money,tax:money,status:sel(Draft/Sent/Paid/Overdue/Void)]
billing|Billing Management|Recurring bills and billing accounts|account:Billing account[name*,email:email,plan,cycle:sel(Monthly/Quarterly/Yearly)];bill:Bill[account:ref(account)*,period,amount:money,status:sel(Open/Paid/Failed)]
tax|Tax Management|Tax filings, VAT and TDS records|filing:Tax filing[period*,type:sel(VAT/TDS/Income tax/Other),taxable:money,tax:money,due:date,status:sel(Pending/Filed/Paid)]
loan|Loan Management|Loans given or taken, schedules and repayments|loan:Loan[borrower*,principal:money,rate_pct:num,start:date,tenure_months:num,status:sel(Active/Closed/Default)];repayment:Repayment[loan:ref(loan)*,date:date,amount:money,status:sel(Paid/Late/Missed)]
payment|Payment Management|Incoming and outgoing payments|payment:Payment[reference*,party,direction:sel(In/Out),amount:money*,date:date,method:sel(Cash/Bank/eSewa/Khalti/Card/Cheque),status:sel(Pending/Cleared/Failed)]
subscription|Subscription Management|Customer subscriptions and renewals|subscription:Subscription[customer*,plan,price:money,start:date,renews:date,status:sel(Trial/Active/Paused/Cancelled)]
salary|Salary Management|Salary structures and advances|structure:Salary structure[employee*,basic:money,allowance:money,pf_pct:num,effective:date];advance:Salary advance[employee*,amount:money,date:date,status:sel(Requested/Given/Recovered)]
wallet|Wallet Management|Internal wallets and balances|wallet:Wallet[owner*,currency,balance:money,status:sel(Active/Frozen)];entry:Wallet entry[wallet:ref(wallet)*,type:sel(Credit/Debit),amount:money*,note,date:date]
transaction|Transaction Management|A ledger of every money movement|txn:Transaction[reference*,date:date,account,type:sel(Credit/Debit),amount:money*,category,status:sel(Posted/Pending/Reversed)]
#health|Healthcare|Hospitals, clinics, patients and pharmacy|FirstAidKit|Care, records and pharmacy
hospital|Hospital Management|Wards, beds and admissions|ward:Ward[name*,floor,beds:num,type:sel(General/ICU/Maternity/Pediatric)];admission:Admission[patient*,ward:ref(ward),bed,admitted:date,discharged:date,doctor,status:sel(Admitted/Discharged/Transferred)]
clinic|Clinic Management|Clinic visits and services|service:Service[name*,fee:money,duration_min:num];visit:Visit[patient*,service:ref(service),doctor,date:date,status:sel(Waiting/In consult/Done)]
patient|Patient Management|Patient registry with contacts|patient:Patient[name*,patient_no,gender:sel(Female/Male/Other),dob:date,phone:phone,blood_group:sel(A+/A-/B+/B-/AB+/AB-/O+/O-),allergies,status:sel(Active/Inactive)]
doctor|Doctor Management|Doctors, specialties and schedules|doctor:Doctor[name*,specialty,nmc_no,phone:phone,fee:money,days,status:sel(Available/On leave)]
pharmacy|Pharmacy Management|Medicines, batches and dispensing|medicine:Medicine[name*,generic,strength,form:sel(Tablet/Capsule/Syrup/Injection/Ointment/Other),price:money,stock:num,expiry:date];dispense:Dispense[medicine:ref(medicine)*,patient,qty:num,date:date]
medstore|Medical Store Management|Retail medical store stock and sales|product:Product[name*,batch,mrp:money,stock:num,expiry:date,rack];sale:Sale[bill_no*,customer,amount:money,date:date,status:sel(Paid/Credit)]
lab|Laboratory Management|Tests, samples and reports|test:Test[name*,code,price:money,turnaround_hours:num];sample:Sample[patient*,test:ref(test),collected:date,status:sel(Collected/Processing/Reported),result:long]
healthappt|Medical Appointment Management|Doctor appointments and queue|appointment:Appointment[patient*,doctor,date:date*,slot,phone:phone,status:sel(Booked/Checked in/Done/No-show/Cancelled)]
records|Medical Records Management|Clinical notes, diagnoses and prescriptions|record:Medical record[patient*,date:date,doctor,diagnosis,prescription:long,follow_up:date]
bloodbank|Blood Bank Management|Donors, units and requests|donor:Donor[name*,blood_group:sel(A+/A-/B+/B-/AB+/AB-/O+/O-),phone:phone,last_donation:date];unit:Blood unit[bag_no*,blood_group:sel(A+/A-/B+/B-/AB+/AB-/O+/O-),collected:date,expiry:date,status:sel(Available/Reserved/Issued/Expired)]
ambulance|Ambulance Management|Vehicles, crews and dispatches|vehicle:Ambulance[number*,type:sel(Basic/Advanced/Patient transport),driver,phone:phone,status:sel(Available/On trip/Maintenance)];trip:Dispatch[caller*,pickup,destination,vehicle:ref(vehicle),date:date,status:sel(Requested/Dispatched/Completed/Cancelled)]
dental|Dental Clinic Management|Dental patients, chairs and treatment plans|treatment:Treatment[patient*,tooth,procedure,cost:money,date:date,status:sel(Planned/In progress/Done)];chair:Chair[name*,dentist,status:sel(Free/Busy/Cleaning)]
#hosp|Hotel & Restaurant|Hotels, restaurants, travel and events|ForkKnife|Guests, tables and trips
hotel|Hotel Management|Front desk: guests and stays|guest:Guest[name*,phone:phone,email:email,nationality,id_doc];stay:Stay[guest:ref(guest)*,room,check_in:date,check_out:date,rate:money,status:sel(Reserved/In house/Checked out/Cancelled)]
restaurant|Restaurant Management|Menu, tables and orders|menu:Menu item[name*,category,price:money,veg:bool,available:bool];order:Order[table*,items:long,total:money,status:sel(Open/Served/Paid/Cancelled)]
foodorder|Food Ordering Management|Online and phone food orders|order:Food order[customer*,phone:phone,address,items:long,total:money,channel:sel(Phone/Website/App/Walk-in),status:sel(New/Preparing/Out for delivery/Delivered/Cancelled)]
hotelbooking|Hotel Booking Management|Reservations from every channel|booking:Booking[guest*,room_type,check_in:date*,check_out:date,guests:num,channel:sel(Direct/OTA/Agent/Walk-in),amount:money,status:sel(Tentative/Confirmed/Cancelled/No-show)]
room|Room Management|Rooms, types and housekeeping state|room:Room[number*,type:sel(Standard/Deluxe/Suite/Dorm),floor,rate:money,status:sel(Clean/Dirty/Occupied/Out of order)]
kitchen|Kitchen Management|Kitchen tickets, recipes and stock|ticket:Kitchen ticket[order_ref*,station:sel(Hot/Cold/Bar/Bakery),items:long,status:sel(Queued/Cooking/Ready/Served)];recipe:Recipe[name*,yield:num,cost:money,steps:long]
reservation|Table Reservation Management|Table bookings and covers|reservation:Reservation[name*,phone:phone,date:date*,time,party_size:num,table,status:sel(Booked/Seated/Finished/No-show/Cancelled)]
cafe|Cafe Management|Café menu, shifts and daily sales|item:Café item[name*,price:money,category:sel(Coffee/Tea/Bakery/Food/Other),available:bool];shift:Shift[barista*,date:date,opening_cash:money,closing_cash:money]
travel|Travel Agency Management|Clients, tickets and visas|booking:Travel booking[client*,type:sel(Flight/Bus/Hotel/Visa/Package),destination,date:date,amount:money,status:sel(Quoted/Booked/Ticketed/Cancelled)]
tourism|Tourism Management|Tour packages, guides and groups|package:Tour package[name*,days:num,price:money,difficulty:sel(Easy/Moderate/Hard)];group:Tour group[package:ref(package),leader,start:date,pax:num,status:sel(Open/Full/Running/Done)]
event|Event Management (Hospitality)|Banquets and hotel events|event:Event[name*,client,date:date*,hall,guests:num,budget:money,status:sel(Enquiry/Confirmed/Done/Cancelled)]
catering|Catering Management|Catering orders and menus|order:Catering order[client*,event_date:date*,venue,plates:num,menu:long,amount:money,status:sel(Quoted/Confirmed/Delivered/Cancelled)]
#retail|Retail & E-commerce|Shops, stock, orders and delivery|Storefront|Sell, stock and deliver
shop|Shop Management|Day-to-day shop products and sales|product:Product[name*,sku,price:money,stock:num,category];sale:Sale[bill_no*,customer,amount:money,date:date,payment:sel(Cash/Card/eSewa/Khalti/Credit)]
supermarket|Supermarket Management|Aisles, products and counters|product:Product[barcode*,name*,aisle,price:money,stock:num,expiry:date];counter:Counter[name*,cashier,status:sel(Open/Closed)]
grocery|Grocery Management|Fresh stock and home-delivery orders|item:Grocery item[name*,unit:sel(kg/g/l/pcs/pack),price:money,stock:num];order:Grocery order[customer*,phone:phone,items:long,total:money,status:sel(New/Packed/Delivered/Cancelled)]
pharmastore|Pharmacy Store Management|OTC and prescription retail|product:Product[name*,schedule:sel(OTC/Prescription),price:money,stock:num,expiry:date];sale:Sale[bill_no*,customer,doctor,amount:money,date:date]
ecommerce|E-commerce Management|Online catalogue, carts and orders|product:Product[name*,slug,price:money,stock:num,published:bool];order:Online order[number*,customer,email:email,total:money,status:sel(Pending/Paid/Shipped/Delivered/Returned/Cancelled)]
order|Order Management|Orders from all channels|order:Order[number*,customer*,channel:sel(Store/Phone/Web/Marketplace),total:money,date:date,status:sel(New/Processing/Fulfilled/Cancelled)]
product|Product Management|Product catalogue and variants|product:Product[name*,sku*,brand,category,price:money,status:sel(Active/Draft/Discontinued)];variant:Variant[product:ref(product)*,option,sku,price:money,stock:num]
sales|Sales Management|Sales targets and closed sales|sale:Sale[reference*,customer,salesperson,amount:money*,date:date,status:sel(Quoted/Won/Lost)];target:Target[salesperson*,period,amount:money,achieved:money]
purchase|Purchase Management|Requisitions and purchase orders|requisition:Requisition[item*,qty:num,needed_by:date,requested_by,status:sel(Open/Approved/Ordered/Rejected)];po:Purchase order[number*,supplier,total:money,date:date,status:sel(Draft/Sent/Received/Closed)]
supplier|Supplier Management|Suppliers, terms and ratings|supplier:Supplier[name*,contact,phone:phone,email:email,pan,payment_terms,rating:num,status:sel(Active/On hold/Blocked)]
warehouse|Warehouse Management|Warehouses, bins and transfers|warehouse:Warehouse[name*,location,capacity:num];transfer:Transfer[item*,from_wh:ref(warehouse),to_wh:ref(warehouse),qty:num,date:date,status:sel(Requested/In transit/Received)]
stock|Stock Management|Stock counts and adjustments|count:Stock count[item*,location,system_qty:num,counted_qty:num,date:date,status:sel(Open/Reconciled)]
pos|POS Management|Point-of-sale terminals and bills|terminal:Terminal[name*,location,status:sel(Online/Offline)];bill:POS bill[bill_no*,terminal:ref(terminal),amount:money,payment:sel(Cash/Card/QR/Credit),date:date]
delivery|Delivery Management|Riders and delivery jobs|rider:Rider[name*,phone:phone,vehicle,status:sel(Available/On delivery/Off)];job:Delivery[order_ref*,address,rider:ref(rider),fee:money,status:sel(Assigned/Picked/Delivered/Failed)]
franchise|Franchise Management|Franchisees, outlets and royalties|outlet:Outlet[name*,franchisee,city,opened:date,royalty_pct:num,status:sel(Active/Suspended/Closed)]
wholesale|Wholesale Management|Bulk buyers, price lists and orders|buyer:Buyer[name*,pan,phone:phone,credit_limit:money];order:Wholesale order[buyer:ref(buyer)*,items:long,total:money,status:sel(Quoted/Confirmed/Dispatched/Paid)]
#realestate|Real Estate|Property, rent, construction and upkeep|Buildings|Property and tenants
realestate|Real Estate Management|Listings, agents and deals|listing:Listing[title*,type:sel(House/Apartment/Land/Commercial),location,price:money,area,status:sel(Available/Under offer/Sold/Rented)];deal:Deal[listing:ref(listing),buyer,agent,amount:money,status:sel(Negotiation/Agreement/Closed/Lost)]
property|Property Management|Owned properties and units|property:Property[name*,address,type,units:num,owner];unit:Unit[property:ref(property)*,unit_no*,area,rent:money,status:sel(Vacant/Occupied/Maintenance)]
houserental|House Rental Management|Houses for rent and agreements|house:House[address*,bedrooms:num,rent:money,status:sel(Vacant/Let)];agreement:Agreement[house:ref(house),tenant,start:date,end:date,deposit:money]
apartment|Apartment Management|Apartment blocks, flats and residents|flat:Flat[number*,block,floor,owner,resident,status:sel(Occupied/Vacant)];notice:Notice[title*,body:long,date:date]
building|Building Management|Building systems and service logs|building:Building[name*,address,floors:num,built:date];system:Building system[name*,building:ref(building),type:sel(Lift/Generator/Water/Fire/HVAC/Other),last_service:date,status:sel(OK/Needs service/Down)]
land|Land Management|Land parcels, plots and ownership|parcel:Parcel[plot_no*,location,area,owner,value:money,status:sel(Owned/Leased/Disputed/Sold)]
tenant|Tenant Management|Tenant profiles and documents|tenant:Tenant[name*,phone:phone,email:email,unit,move_in:date,id_doc,status:sel(Current/Past/Blacklisted)]
rent|Rent Collection Management|Monthly rent dues and collections|due:Rent due[tenant*,unit,month*,amount:money,paid:money,status:sel(Due/Partial/Paid/Late)]
propbooking|Property Booking Management|Site visits and booking tokens|visit:Site visit[client*,property,date:date,agent,status:sel(Scheduled/Done/No-show)];token:Booking token[client*,property,amount:money,date:date,status:sel(Held/Converted/Refunded)]
construction|Construction Management|Sites, BOQ items and daily progress|site:Site[name*,client,location,budget:money,start:date,status:sel(Planning/Active/Paused/Handed over)];boq:BOQ item[site:ref(site),item*,qty:num,unit,rate:money]
remaintenance|Maintenance Management (Property)|Repair tickets for units|ticket:Repair ticket[unit*,issue*,priority:sel(Low/Medium/High),reported:date,assigned_to,status:sel(Open/In progress/Done)]
facility|Facility Management|Facilities, bookings and contracts|facility:Facility[name*,type,location,status:sel(Available/Closed)];contract:Service contract[vendor*,facility:ref(facility),start:date,end:date,amount:money]
#transport|Transport & Logistics|Fleet, drivers, shipments and parking|Truck|Move people and goods
transport|Transport Management|Routes, trips and fares|route:Route[name*,origin,destination,distance_km:num,fare:money];trip:Trip[route:ref(route),vehicle,driver,date:date,status:sel(Scheduled/Running/Done/Cancelled)]
fleet|Fleet Management|Vehicles, documents and costs|vehicle:Vehicle[number*,type,make,year:num,insurance_expiry:date,bluebook_expiry:date,status:sel(Active/Workshop/Retired)]
vehicle|Vehicle Management|Vehicle service history|service:Service record[vehicle*,date:date,odometer:num,work:long,cost:money,garage]
driver|Driver Management|Drivers, licences and duty|driver:Driver[name*,licence_no,licence_expiry:date,phone:phone,status:sel(On duty/Off duty/Suspended)]
bus|Bus Management|Bus schedules, seats and tickets|schedule:Bus schedule[route*,departure,bus_no,seats:num,fare:money];ticket:Ticket[passenger*,schedule:ref(schedule),seat,phone:phone,status:sel(Booked/Boarded/Cancelled)]
taxi|Taxi Management|Taxi rides and drivers|ride:Ride[passenger*,pickup,drop,driver,fare:money,date:date,status:sel(Requested/On the way/Completed/Cancelled)]
truck|Truck Management|Loads, trips and freight|load:Load[consignor*,goods,weight_t:num,origin,destination,freight:money,status:sel(Booked/Loaded/In transit/Delivered)]
logistics|Logistics Management|Consignments across warehouses and carriers|consignment:Consignment[number*,shipper,consignee,carrier,mode:sel(Road/Air/Sea/Rail),eta:date,status:sel(Booked/In transit/Customs/Delivered)]
courier|Courier Management|Parcels, pickups and proof of delivery|parcel:Parcel[tracking_no*,sender,receiver,receiver_phone:phone,address,cod:money,status:sel(Booked/Picked/In hub/Out for delivery/Delivered/Returned)]
shipment|Shipment Management|Shipments with packages and costs|shipment:Shipment[reference*,origin,destination,packages:num,weight_kg:num,cost:money,status:sel(Draft/Shipped/Delivered/Lost)]
fuel|Fuel Management|Fuel fills and consumption|fill:Fuel fill[vehicle*,date:date,litres:num,amount:money,odometer:num,station]
parking|Parking Management|Spaces, permits and tickets|space:Space[code*,zone,type:sel(Car/Bike/EV/Disabled),status:sel(Free/Occupied/Reserved)];ticket:Parking ticket[plate*,space:ref(space),in_time,out_time,fee:money]
vehiclerental|Vehicle Rental Management|Rental fleet and bookings|rental:Rental[customer*,vehicle,from:date,to:date,rate:money,deposit:money,status:sel(Booked/Out/Returned/Cancelled)]
gps|GPS Tracking Management|Trackers and location logs (manual or imported)|tracker:Tracker[imei*,vehicle,sim,status:sel(Active/Offline)];ping:Location log[tracker:ref(tracker),lat:num,lng:num,speed_kmh:num,at:dt]
#mfg|Manufacturing|Production, machines, quality and safety|Factory|Make things reliably
manufacturing|Manufacturing Management|Products, BOMs and output|product:Finished good[name*,sku,unit,std_cost:money];bom:BOM line[product:ref(product)*,material*,qty:num,unit]
production|Production Management|Production runs and output|run:Production run[product*,batch_no,planned_qty:num,produced_qty:num,date:date,status:sel(Planned/Running/Done/Stopped)]
factory|Factory Management|Plants, lines and shifts|line:Line[name*,plant,capacity_per_hr:num,status:sel(Running/Idle/Down)];shift:Shift[name*,line:ref(line),supervisor,start,end]
machine|Machine Management|Machines and downtime|machine:Machine[code*,name*,line,installed:date,status:sel(Running/Idle/Breakdown/Retired)];downtime:Downtime[machine:ref(machine),from:dt,to:dt,reason]
quality|Quality Management|Inspections and non-conformances|inspection:Inspection[batch*,inspector,date:date,sample:num,defects:num,result:sel(Pass/Fail/Hold)];ncr:Non-conformance[title*,severity:sel(Minor/Major/Critical),owner,status:sel(Open/Contained/Closed)]
mfgmaintenance|Maintenance Management (Plant)|Preventive and breakdown maintenance|job:Maintenance job[machine*,type:sel(Preventive/Breakdown/Inspection),due:date,technician,status:sel(Planned/In progress/Done)]
supplychain|Supply Chain Management|Supply plans and lead times|plan:Supply plan[material*,supplier,lead_days:num,safety_stock:num,next_order:date,status:sel(OK/Reorder/Late)]
rawmaterial|Raw Materials Management|Raw material stock and consumption|material:Raw material[name*,grade,unit,stock:num,reorder_at:num,cost:money]
workorder|Work Order Management|Work orders for the shop floor|wo:Work order[number*,product,qty:num,due:date,assigned_line,status:sel(Open/Released/In progress/Completed/Cancelled)]
prodplanning|Production Planning|Weekly production plans|plan:Plan line[week*,product,planned_qty:num,line,status:sel(Draft/Locked)]
industrialasset|Industrial Asset Management|Plant assets and calibration|asset:Industrial asset[tag*,name*,location,calibration_due:date,value:money,status:sel(Operational/Calibration due/Retired)]
safety|Safety Management|Incidents, permits and drills|incident:Incident[title*,date:date,location,severity:sel(Near miss/Minor/Major/Fatal),reported_by,status:sel(Reported/Investigating/Closed)];permit:Work permit[work*,area,issued_to,valid_until:date,status:sel(Issued/Closed)]
#agri|Agriculture|Farms, crops, animals and harvest|Plant|Grow and raise
farm|Farm Management|Farm plots and activities|plot:Plot[name*,area_ropani:num,soil,crop,status:sel(Fallow/Planted/Harvested)];activity:Activity[plot:ref(plot),type:sel(Ploughing/Sowing/Irrigation/Spraying/Weeding/Harvest),date:date,cost:money]
agriculture|Agriculture Management|Seasons, inputs and yields|season:Season[name*,crop,start:date,end:date,expected_yield:num,actual_yield:num]
crop|Crop Management|Crops, varieties and growth stage|crop:Crop[name*,variety,plot,sown:date,stage:sel(Seedling/Vegetative/Flowering/Fruiting/Mature),expected_harvest:date]
livestock|Livestock Management|Animals, health and breeding|animal:Animal[tag*,species:sel(Cow/Buffalo/Goat/Sheep/Pig/Other),breed,born:date,sex:sel(Female/Male),status:sel(Healthy/Sick/Sold/Dead)];treatment:Vet treatment[animal:ref(animal),date:date,treatment,cost:money]
dairy|Dairy Management|Milk collection and sales|collection:Milk collection[farmer*,date:date,shift:sel(Morning/Evening),litres:num,fat_pct:num,amount:money];sale:Milk sale[buyer*,litres:num,amount:money,date:date]
poultry|Poultry Management|Flocks, feed and eggs|flock:Flock[batch*,type:sel(Broiler/Layer/Local),birds:num,placed:date,status:sel(Growing/Laying/Sold)];eggs:Egg log[flock:ref(flock),date:date,eggs:num,broken:num]
fishfarm|Fish Farm Management|Ponds, stocking and harvest|pond:Pond[name*,area_m2:num,species,stocked:date,fingerlings:num];harvest:Fish harvest[pond:ref(pond),date:date,kg:num,price_per_kg:money]
irrigation|Irrigation Management|Water sources and schedules|source:Water source[name*,type:sel(Canal/Well/Pump/Rain/Other),capacity];schedule:Irrigation schedule[plot*,source:ref(source),date:date,hours:num]
fertilizer|Fertilizer Management|Fertilizer stock and use|product:Fertilizer[name*,type:sel(Urea/DAP/Potash/Compost/Other),stock_kg:num,price:money];use:Application[plot*,product:ref(product),kg:num,date:date]
seed|Seed Management|Seed lots and germination|lot:Seed lot[crop*,variety,supplier,kg:num,germination_pct:num,expiry:date]
harvest|Harvest Management|Harvest records and sales|harvest:Harvest[crop*,plot,date:date,qty:num,unit:sel(kg/quintal/ton/crate),sold_to,amount:money]
agriequipment|Agricultural Equipment Management|Tractors, tools and rentals|equipment:Equipment[name*,type:sel(Tractor/Thresher/Pump/Tiller/Sprayer/Other),purchased:date,status:sel(Available/In use/Repair)];rental:Equipment rental[equipment:ref(equipment),renter,date:date,hours:num,amount:money]
#sports|Sports & Fitness|Clubs, leagues, gyms and academies|SoccerBall|Teams, members and matches
sports|Sports Management|Sports programs and facilities|program:Program[name*,sport,coach,season,fee:money,status:sel(Open/Running/Closed)]
football|Football Club Management|Squad, fixtures and training|player:Player[name*,position:sel(GK/DF/MF/FW),jersey:num,dob:date,status:sel(Fit/Injured/Suspended)];fixture:Fixture[opponent*,date:date,venue,competition,result]
cricket|Cricket Club Management|Squad, matches and stats|player:Player[name*,role:sel(Batter/Bowler/All-rounder/Wicket-keeper),runs:num,wickets:num];match:Match[opponent*,date:date,format:sel(T20/ODI/Test/Other),result]
tournament|Tournament Management|Tournaments, teams and fixtures|tournament:Tournament[name*,sport,start:date,end:date,format:sel(League/Knockout/Groups+Knockout),status:sel(Planned/Live/Finished)];entry:Team entry[team*,tournament:ref(tournament),fee:money,status:sel(Registered/Confirmed/Withdrawn)]
league|League Management|Seasons, standings and results|team:League team[name*,played:num,won:num,drawn:num,lost:num,points:num];result:Result[home*,away*,home_score:num,away_score:num,date:date]
player|Player Management|Player registry and contracts|player:Player[name*,sport,team,dob:date,contract_end:date,status:sel(Active/Injured/Released)]
sportsteam|Team Management (Sports)|Teams, staff and rosters|team:Team[name*,sport,coach,category:sel(Senior/U19/U16/Women/Mixed)];staff:Team staff[name*,team:ref(team),role]
gym|Gym Management|Members, plans and check-ins|member:Member[name*,phone:phone,plan,start:date,end:date,status:sel(Active/Expired/Frozen)];checkin:Check-in[member:ref(member),at:dt]
fitness|Fitness Center Management|Classes, trainers and bookings|class:Class[name*,trainer,day,time,capacity:num];booking:Class booking[member*,class:ref(class),date:date,status:sel(Booked/Attended/Missed)]
membership|Membership Management (Sports)|Memberships, renewals and dues|membership:Membership[member*,type:sel(Monthly/Quarterly/Yearly/Lifetime),start:date,renews:date,fee:money,status:sel(Active/Due/Lapsed)]
academy|Sports Academy Management|Trainees, batches and fees|trainee:Trainee[name*,sport,batch,guardian_phone:phone,fee:money,status:sel(Active/Paused/Left)]
matchsched|Match Scheduling|Fixtures, venues and officials|match:Match[home*,away*,date:date*,time,venue,referee,status:sel(Scheduled/Played/Postponed)]
coaching|Coaching Management|Sessions, drills and attendance|session:Coaching session[topic*,coach,date:date,duration_min:num,attendees:num,notes:long]
stadium|Stadium Management|Stands, bookings and events|booking:Stadium booking[organiser*,event,date:date,stands,capacity:num,fee:money,status:sel(Requested/Confirmed/Done/Cancelled)]
#orgs|Organizations & Events|Events, NGOs, clubs and donations|UsersThree|People coming together
orgevent|Event Management|Events, sessions and attendees|event:Event[name*,date:date*,venue,capacity:num,status:sel(Draft/Open/Sold out/Done/Cancelled)];attendee:Attendee[name*,event:ref(event),email:email,phone:phone,status:sel(Registered/Checked in/Cancelled)]
wedding|Wedding Management|Weddings, vendors and guests|wedding:Wedding[couple*,date:date,venue,budget:money,status:sel(Planning/Booked/Done)];guest:Guest[name*,wedding:ref(wedding),side:sel(Bride/Groom/Both),rsvp:sel(Pending/Yes/No)]
conference|Conference Management|Talks, speakers and registrations|talk:Talk[title*,speaker,track,slot,room];registration:Registration[name*,email:email,ticket:sel(Standard/Student/VIP/Speaker),paid:money]
exhibition|Exhibition Management|Stalls and exhibitors|stall:Stall[number*,size,price:money,exhibitor,status:sel(Free/Held/Booked)]
ticket|Ticket Management|Ticket types and sales|type:Ticket type[name*,price:money,quantity:num,sold:num];sale:Ticket sale[buyer*,type:ref(type),qty:num,amount:money,status:sel(Paid/Refunded)]
volunteer|Volunteer Management|Volunteers, shifts and hours|volunteer:Volunteer[name*,phone:phone,skills,status:sel(Active/Inactive)];shift:Volunteer shift[volunteer:ref(volunteer),task,date:date,hours:num]
ngo|NGO Management|Programs, beneficiaries and donors|program:Program[name*,area,budget:money,start:date,status:sel(Planned/Running/Closed)];beneficiary:Beneficiary[name*,program:ref(program),location,phone:phone]
nonprofit|Nonprofit Management|Grants and reports|grant:Grant[funder*,title,amount:money,start:date,end:date,status:sel(Applied/Awarded/Reporting/Closed)];report:Grant report[grant:ref(grant),due:date,status:sel(Due/Submitted)]
club|Club Management|Club members and meetings|member:Club member[name*,phone:phone,joined:date,status:sel(Active/Inactive)];meeting:Meeting[title*,date:date,minutes:long]
association|Association Management|Associations, committees and resolutions|committee:Committee[name*,chair,members:num];resolution:Resolution[title*,date:date,committee:ref(committee),status:sel(Proposed/Passed/Rejected)]
orgmembership|Membership Management|Members, tiers and dues for any organisation|member:Member[name*,email:email,tier:sel(Basic/Silver/Gold/Honorary),joined:date,dues:money,status:sel(Active/Due/Lapsed)]
donation|Donation Management|Donors and donations|donor:Donor[name*,email:email,phone:phone,type:sel(Individual/Company/Foundation)];donation:Donation[donor:ref(donor),amount:money*,date:date,purpose,receipt_no]
#it|IT & Technology|IT ops, software, infra and support|Cpu|Keep systems running
itm|IT Management|IT inventory and requests|device:Device[tag*,type:sel(Laptop/Desktop/Phone/Printer/Other),user,purchased:date,status:sel(In use/Spare/Repair/Retired)];request:IT request[title*,requested_by,priority:sel(Low/Medium/High),status:sel(Open/In progress/Done)]
itsm|ITSM|Incidents, problems and changes|incident:Incident[title*,service,impact:sel(Low/Medium/High),assignee,status:sel(New/In progress/Resolved/Closed)];change:Change[title*,risk:sel(Low/Medium/High),planned:date,status:sel(Draft/Approved/Done/Rolled back)]
softproj|Software Project Management|Repos, sprints and releases|sprint:Sprint[name*,start:date,end:date,goal,status:sel(Planned/Active/Closed)];release:Release[version*,date:date,notes:long,status:sel(Planned/Shipped)]
website|Website Management|Sites, pages and renewals|site:Website[domain*,platform,owner,launched:date,status:sel(Live/Maintenance/Offline)];page:Page[title*,site:ref(site),path,status:sel(Draft/Published)]
cms|CMS|Articles, categories and authors|article:Article[title*,author,category,published:date,status:sel(Draft/Review/Published)]
database|Database Management|Databases, backups and owners|db:Database[name*,engine:sel(PostgreSQL/MySQL/SQLite/MongoDB/Other),host,size_gb:num,owner];backup:Backup[db:ref(db),at:dt,size_gb:num,status:sel(OK/Failed)]
server|Server Management|Servers and their health|server:Server[hostname*,ip,os,role,location,status:sel(Up/Degraded/Down)]
cloud|Cloud Management|Cloud accounts, resources and costs|resource:Cloud resource[name*,provider,type,region,monthly_cost:money,status:sel(Running/Stopped/Deleted)]
cyber|Cybersecurity Management|Risks, vulnerabilities and audits|vuln:Vulnerability[title*,system,severity:sel(Low/Medium/High/Critical),found:date,status:sel(Open/Mitigated/Accepted/Fixed)]
network|Network Management|Network devices and links|device:Network device[name*,type:sel(Router/Switch/AP/Firewall/Other),ip,location,status:sel(Up/Down)]
api|API Management|APIs, keys register and versions|api:API[name*,base_url:url,version,owner,status:sel(Active/Deprecated)]
domain|Domain Management|Domains and renewal dates|domain:Domain[name*,registrar,expires:date,auto_renew:bool,status:sel(Active/Expiring/Expired)]
hosting|Hosting Management|Hosting plans and clients|plan:Hosting plan[client*,provider,plan,renews:date,price:money,status:sel(Active/Suspended/Cancelled)]
bugtrack|Bug Tracking|Bugs with severity and owners|bug:Bug[title*,component,severity:sel(Low/Medium/High/Critical),assignee,status:sel(New/Confirmed/In progress/Fixed/Won't fix)]
helpdesk|Helpdesk Management|Tickets from staff and customers|ticket:Ticket[subject*,requester,channel:sel(Email/Phone/Web/Walk-in),priority:sel(Low/Normal/High/Urgent),status:sel(Open/Pending/Resolved/Closed)]
support|Customer Support Management|Customer cases and SLAs|case:Support case[subject*,customer,product,sla_hours:num,status:sel(New/Waiting on us/Waiting on customer/Solved)]
#media|Music & Entertainment|Music, video, social and marketing|MusicNotes|Create, publish and earn
musicdist|Music Distribution Management|Releases, tracks and store status|release:Release[title*,artist,type:sel(Single/EP/Album),release_date:date,upc,status:sel(Draft/Submitted/Live/Taken down)];track:Track[title*,release:ref(release),isrc,duration]
artist|Artist Management|Artists, contracts and bookings|artist:Artist[name*,genre,manager,phone:phone,contract_end:date];booking:Gig booking[artist:ref(artist),venue,date:date,fee:money,status:sel(Hold/Confirmed/Played/Cancelled)]
label|Record Label Management|Roster, releases and budgets|signing:Signing[artist*,deal:sel(Single/EP/Album/Multi-album),advance:money,signed:date];budget:Release budget[release*,amount:money,spent:money]
royalties|Music Royalties Management|Statements and splits|statement:Royalty statement[source*,period,gross:money,status:sel(Received/Allocated/Paid)];split:Split[track*,payee,share_pct:num]
publishing|Music Publishing Management|Works, writers and registrations|work:Work[title*,writers,iswc,registered:bool]
youtube|YouTube Management|Videos, uploads and revenue|video:Video[title*,channel,publish_date:date,views:num,revenue:money,status:sel(Idea/Editing/Scheduled/Published)]
social|Social Media Management|Posts, calendar and results|post:Post[title*,platform:sel(Facebook/Instagram/TikTok/YouTube/X/LinkedIn),date:date,reach:num,status:sel(Draft/Scheduled/Published)]
influencer|Influencer Management|Creators and campaigns|creator:Creator[name*,platform,followers:num,rate:money];campaign:Campaign[name*,creator:ref(creator),fee:money,status:sel(Pitching/Booked/Live/Done)]
videoprod|Video Production Management|Shoots, crew and deliverables|shoot:Shoot[project*,date:date,location,crew,budget:money,status:sel(Pre-production/Shooting/Editing/Delivered)]
filmprod|Film Production Management|Scenes, schedule and budget|scene:Scene[number*,location,cast,shoot_date:date,status:sel(Scheduled/Shot/Reshoot)];cost:Cost[head*,amount:money,date:date]
mediaasset|Media Assets Management|Files, rights and licences|asset:Media asset[title*,type:sel(Audio/Video/Image/Document),link:url,licence,expires:date]
podcast|Podcast Management|Episodes, guests and publishing|episode:Episode[title*,number:num,guest,record_date:date,publish_date:date,status:sel(Planned/Recorded/Edited/Published)]
streaming|Streaming Management|Streams, schedules and platforms|stream:Stream[title*,platform:sel(YouTube/Facebook/Twitch/TikTok/Other),date:date,peak_viewers:num,status:sel(Scheduled/Live/Ended)]
digitalmkt|Digital Marketing Management|Campaigns, spend and leads|campaign:Campaign[name*,channel:sel(Meta/Google/TikTok/Email/SEO/Other),budget:money,spend:money,leads:num,status:sel(Draft/Running/Paused/Ended)]
#gov|Government & Public Services|Offices, wards, citizens and records|Bank|Serve citizens
govoffice|Government Office Management|Files, dispatch and darta-chalani|file:Office file[subject*,file_no,section,received:date,status:sel(Received/In process/Decided/Archived)];dispatch:Dispatch[letter_no*,to,subject,date:date]
municipality|Municipality Management|Projects and service requests|project:Municipal project[name*,ward,budget:money,contractor,status:sel(Planned/Running/Completed)];request:Service request[citizen*,service,ward,status:sel(Received/In process/Done)]
ward|Ward Office Management|Recommendations and records|recommendation:Recommendation (sifaris)[citizen*,type,date:date,fee:money,status:sel(Applied/Issued/Rejected)]
govtax|Tax Management (Public)|Property and business tax collection|assessment:Tax assessment[taxpayer*,type:sel(Property/Business/Land/Other),fiscal_year,amount:money,status:sel(Assessed/Paid/Overdue)]
citizen|Citizen Management|Citizen registry|citizen:Citizen[name*,citizenship_no,ward,phone:phone,dob:date]
complaint|Public Complaints Management|Complaints from the public|complaint:Complaint[subject*,citizen,category,ward,received:date,status:sel(Received/Assigned/Resolved/Rejected)]
landreg|Land Registration Management|Land records and transfers|record:Land record[kitta_no*,owner,area,location,registered:date];transfer:Transfer[kitta_no*,from_owner,to_owner,date:date,status:sel(Applied/Approved/Rejected)]
publictransport|Public Transport Management|Routes, permits and operators|permit:Route permit[operator*,route,vehicles:num,valid_until:date,status:sel(Active/Expired/Suspended)]
election|Election Management|Constituencies, candidates and results|candidate:Candidate[name*,party,constituency,votes:num];booth:Polling booth[name*,constituency,voters:num]
policecase|Police Case Management|Case register and progress|case:Case[case_no*,type,complainant,officer,registered:date,status:sel(Registered/Investigating/Charge sheet/Closed)]
publicresource|Public Resources Management|Public assets and allocations|resource:Public resource[name*,type,location,value:money,custodian,status:sel(In use/Available/Damaged)]
docreg|Document Registration Management|Registered documents and fees|registration:Registration[doc_type*,applicant,reg_no,date:date,fee:money,status:sel(Applied/Registered/Rejected)]
#personal|Personal & Daily Life|Money, habits, home and plans|House|Run your own life
personalfin|Personal Finance Management|Accounts, net worth and goals|account:Account[name*,type:sel(Bank/Cash/Wallet/Card/Investment/Loan),balance:money]
dailyexp|Daily Expenses Management|Everyday spending log|expense:Expense[item*,category:sel(Food/Transport/Bills/Shopping/Health/Fun/Other),amount:money*,date:date,paid_with:sel(Cash/Card/eSewa/Khalti/Bank)]
personaltask|Personal Task Management|Your own to-dos|todo:To-do[title*,due:date,priority:sel(Low/Normal/High),done:bool]
habit|Habit Management|Habits and streaks|habit:Habit[name*,frequency:sel(Daily/Weekdays/Weekly),target:num];log:Habit log[habit:ref(habit)*,date:date*,done:bool]
personalbudget|Budget Management (Personal)|Monthly budget envelopes|envelope:Envelope[category*,month*,limit:money,spent:money]
family|Family Management|Family members, events and chores|member:Family member[name*,relation,dob:date,phone:phone];event:Family event[title*,date:date,notes]
household|Household Management|Bills, groceries and repairs at home|bill:Household bill[name*,amount:money,due:date,status:sel(Due/Paid)];repair:Repair[item*,vendor,cost:money,date:date]
personaldocs|Personal Documents Management|IDs, certificates and expiry dates|doc:Document[name*,type:sel(Citizenship/Passport/Licence/Certificate/Insurance/Other),number,expires:date,stored_at]
time|Time Management|Time blocks and logged hours|entry:Time entry[activity*,project,date:date,hours:num*,billable:bool]
goals|Goals Management|Goals and key results|goal:Goal[title*,area:sel(Health/Career/Money/Learning/Family/Other),target_date:date,progress_pct:num,status:sel(Not started/On track/Behind/Done)]
personalsubs|Subscriptions Management (Personal)|Apps and services you pay for|sub:Subscription[service*,price:money,cycle:sel(Monthly/Yearly),renews:date,status:sel(Active/Cancelled)]
passwords|Passwords Management (vault index)|Where each login lives. Stores no passwords: only the site, username and which vault holds it|entry:Login entry[site*,username,vault:sel(Phone/Browser/Bitwarden/1Password/Other),two_factor:bool,last_changed:date]
travelplan|Travel Planning Management|Trips, itinerary and packing|trip:Trip[destination*,start:date,end:date,budget:money,status:sel(Idea/Planned/Booked/Done)];stop:Itinerary stop[trip:ref(trip),place*,date:date,notes]
#pro|Professional Services|Legal, insurance, consulting and compliance|Scales|Expert services, well run
lawfirm|Law Firm Management|Clients, matters and billing|client:Client[name*,phone:phone,email:email];matter:Matter[title*,client:ref(client),lawyer,opened:date,status:sel(Open/On hold/Closed)]
legalcase|Legal Case Management|Court cases, hearings and documents|case:Court case[case_no*,court,parties,next_hearing:date,status:sel(Filed/Hearing/Judgement/Appeal/Closed)]
insurance|Insurance Management|Policies and premiums|policy:Policy[policy_no*,holder,type:sel(Life/Health/Motor/Property/Travel/Other),premium:money,start:date,end:date,status:sel(Active/Lapsed/Cancelled)]
claims|Insurance Claims Management|Claims and settlement|claim:Claim[claim_no*,policy,claimant,amount:money,filed:date,status:sel(Filed/Surveying/Approved/Rejected/Paid)]
consultancy|Consultancy Management|Engagements and deliverables|engagement:Engagement[client*,scope,fee:money,start:date,status:sel(Proposal/Active/Delivered/Closed)]
freelancer|Freelancer Management|Freelance gigs, clients and payouts|gig:Gig[title*,client,platform:sel(Direct/Upwork/Fiverr/Other),rate:money,due:date,status:sel(Pitching/Active/Delivered/Paid)]
agency|Agency Management|Agency clients and retainers|client:Agency client[name*,retainer:money,account_manager,status:sel(Active/Paused/Churned)];job:Job[title*,client:ref(client),due:date,status:sel(Brief/In work/Review/Done)]
recruitment|Recruitment Management|Openings, candidates and interviews|opening:Opening[title*,department,positions:num,status:sel(Open/On hold/Filled)];candidate:Candidate[name*,opening:ref(opening),email:email,phone:phone,stage:sel(Applied/Screen/Interview/Offer/Hired/Rejected)]
jobportal|Job Portal Management|Job posts and applications|post:Job post[title*,company,location,salary,deadline:date,status:sel(Draft/Live/Closed)];application:Application[applicant*,post:ref(post),email:email,status:sel(New/Shortlisted/Rejected)]
feedback|Feedback Management|Feedback from customers and staff|feedback:Feedback[title*,from,channel:sel(Form/Email/Phone/In person),rating:num,status:sel(New/Reviewed/Actioned)]
complaints|Complaints Management|Customer complaints and resolution|complaint:Complaint[subject*,customer,received:date,owner,status:sel(Open/Investigating/Resolved/Rejected)]
contract|Contracts Management|Contracts, parties and renewals|contract:Contract[title*,party,value:money,start:date,end:date,status:sel(Draft/Signed/Expired/Terminated)]
compliance|Compliance Management|Obligations and evidence|obligation:Obligation[title*,regulation,owner,due:date,status:sel(Pending/Compliant/Breach)]
risk|Risk Management|Risk register|risk:Risk[title*,category,likelihood:num,impact:num,owner,status:sel(Open/Mitigating/Closed)]
audit|Audit Management|Audits, findings and actions|audit:Audit[title*,area,auditor,date:date,status:sel(Planned/Fieldwork/Reported)];finding:Finding[title*,audit:ref(audit),severity:sel(Low/Medium/High),status:sel(Open/Closed)]
research|Research Management|Studies, participants and outputs|study:Study[title*,lead,start:date,end:date,status:sel(Proposal/Approved/Running/Published)];output:Output[title*,study:ref(study),type:sel(Paper/Report/Dataset/Talk),link:url]`;

const label = (k: string) => {
  const s = k.replace(/_/g, ' ');
  const fixed: Record<string, string> = { dob: 'Date of birth', id_doc: 'ID document', pan: 'PAN', sku: 'SKU', isbn: 'ISBN', upc: 'UPC', isrc: 'ISRC', iswc: 'ISWC', imei: 'IMEI', ip: 'IP address', nmc_no: 'NMC no.', boq: 'BOQ', url: 'URL', eta: 'ETA', mrp: 'MRP', sla_hours: 'SLA hours', cod: 'Cash on delivery', os: 'OS' };
  if (fixed[k]) return fixed[k];
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/\bno\b/, 'no.').replace(/\bpct\b/, '%').replace(/\bkm\b/, 'km');
};

function parseField(raw: string): Field {
  const m = /^([a-z_][a-z0-9_]*)(\*)?(?::(\w+)(?:\(([^)]*)\))?)?(\*)?$/.exec(raw.trim());
  if (!m) throw new Error('bad field: ' + raw);
  const [, key, star1, t = 'text', arg, star2] = m; const star = star1 || star2;
  const type = t as FieldType;
  if (!['text', 'long', 'num', 'money', 'date', 'dt', 'email', 'phone', 'url', 'bool', 'sel', 'ref'].includes(type)) throw new Error('bad type: ' + raw);
  const f: Field = { key, label: label(key), type, required: !!star };
  if (type === 'sel') f.options = (arg || '').split('/').map((s) => s.trim()).filter(Boolean);
  if (type === 'ref') f.ref = arg;
  return f;
}

function parseEntity(raw: string): Entity {
  const m = /^([a-z][a-z0-9_]*):([^[]+)\[(.*)\]$/.exec(raw.trim());
  if (!m) throw new Error('bad entity: ' + raw);
  const fields = m[3].split(',').map(parseField);
  const st = fields.find((f) => f.type === 'sel' && (f.key === 'status' || f.key === 'stage' || f.key === 'result' || f.key === 'rsvp'));
  return {
    key: m[1], name: m[2].trim(), fields, titleField: fields[0].key, statusField: st ? st.key : null,
    moneyField: fields.find((f) => f.type === 'money')?.key ?? null,
    dateField: fields.find((f) => f.type === 'date')?.key ?? null,
  };
}

function build() {
  const categories: Category[] = []; const modules: ModuleDef[] = []; let cat: Category | null = null;
  for (const line of REGISTRY_SRC.split('\n').map((l) => l.trim()).filter(Boolean)) {
    const p = line.split('|');
    if (line.startsWith('#')) { cat = { key: p[0].slice(1), name: p[1], description: p[2], icon: p[3], tagline: p[4], modules: [] }; categories.push(cat); continue; }
    if (!cat || p.length !== 4) throw new Error('bad module line: ' + line);
    const entities = p[3].split(';').map(parseEntity);
    for (const e of entities) for (const f of e.fields) if (f.type === 'ref' && !entities.some((x) => x.key === f.ref)) throw new Error(`ref ${f.ref} missing in ${p[0]}`);
    modules.push({ key: p[0], name: p[1], description: p[2], category: cat.key, entities, tier: 'standard' });
    cat.modules.push(p[0]);
  }
  return { categories, modules };
}
const built = build();
export const CATEGORIES: Category[] = built.categories;
export const MODULES: ModuleDef[] = built.modules;
const BY_KEY = new Map(MODULES.map((m) => [m.key, m]));
export const getModule = (k: string) => BY_KEY.get(k);
export const getEntity = (m: string, e: string) => BY_KEY.get(m)?.entities.find((x) => x.key === e);
export const getCategory = (k: string) => CATEGORIES.find((c) => c.key === k);
// Modules suggested at onboarding, by the industry an organisation picks.
export const STARTER_BY_CATEGORY: Record<string, string[]> = {
  edu: ['school', 'student', 'attendance', 'fee'], biz: ['crm', 'task', 'employee', 'inventory'], fin: ['accounting', 'expense', 'invoice', 'tax'],
  health: ['patient', 'healthappt', 'records', 'pharmacy'], hosp: ['hotel', 'room', 'restaurant', 'reservation'], retail: ['shop', 'product', 'order', 'supplier'],
  realestate: ['property', 'tenant', 'rent', 'remaintenance'], transport: ['fleet', 'driver', 'fuel', 'shipment'], mfg: ['production', 'workorder', 'quality', 'machine'],
  agri: ['farm', 'crop', 'harvest', 'livestock'], sports: ['sportsteam', 'player', 'matchsched', 'membership'], orgs: ['orgevent', 'orgmembership', 'donation', 'volunteer'],
  it: ['helpdesk', 'itsm', 'server', 'domain'], media: ['musicdist', 'artist', 'royalties', 'youtube'], gov: ['govoffice', 'complaint', 'citizen', 'docreg'],
  personal: ['dailyexp', 'personaltask', 'habit', 'goals'], pro: ['lawfirm', 'contract', 'compliance', 'risk'],
};
