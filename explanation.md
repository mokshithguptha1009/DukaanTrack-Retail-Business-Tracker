# DukaanTrack – Retail Business Tracker

## 1. Project Overview

DukaanTrack is a full-stack web application designed to simplify the daily management of small and medium-sized retail businesses. It provides a centralized platform to record sales and expenses, manage customer debts, track cheques, monitor financial activity, and generate reports.

The main objective is to reduce dependence on manual registers and help shop owners maintain organized business records.

## 2. Problem Statement

Many small retail businesses maintain sales, expenses, customer credit, and payment details using handwritten registers or separate spreadsheets. This can make it difficult to track outstanding payments, remember cheque due dates, and understand daily business performance.

DukaanTrack addresses these challenges by bringing important business management functions into a single application.

## 3. Objectives

- Digitize daily sales and expense records.
- Track customer credit and outstanding payments.
- Maintain cheque details and due dates.
- Display summarized financial information.
- Compare sales and expenses through charts.
- Generate date-filtered reports and export transactions.
- Provide a centralized place for business-related notes.

## 4. Technologies Used

### Frontend
**React.js:** Builds the user interface and provides separate screens for the application's features.

### Backend
**Node.js:** Runs the server-side JavaScript environment.

**Express.js:** Handles API requests between the frontend and backend and supports business operations.

### Database
**MongoDB:** Stores business records.

**Mongoose:** Defines data models and helps the backend interact with MongoDB.

### Other Tools
- Visual Studio Code for development.
- Git and GitHub for version control and source code hosting.
- CSV export for downloading transaction records.

## 5. Main Features

### 5.1 User Authentication
Provides a login mechanism for accessing the application's protected features.

### 5.2 Dashboard
Displays summarized business information, including daily sales, payments collected, credit sales, and expenses. It helps the owner understand current business activity at a glance.

### 5.3 Sales and Expense Management
Allows the owner to record sales and expenses along with relevant transaction details, dates, and payment methods.

### 5.4 Debtor Management
Maintains customer-related credit information using phone numbers to distinguish customers. It helps track outstanding balances and repayments.

### 5.5 Cheque and Bank Tracker
Stores cheque details such as cheque number, recipient, amount, bank name, due date, and notes. It supports monitoring upcoming payments and estimating the balance required for planned commitments.

### 5.6 Reports and Charts
Provides date-based transaction filtering and visual comparisons of sales and expenses. These features help the owner review business activity over time.

### 5.7 CSV Export
Allows transaction records to be exported in CSV format for viewing or further analysis in spreadsheet software.

### 5.8 Owner Notepad
Provides a place to record business reminders and notes for future reference.

## 6. System Architecture

The application follows a three-layer architecture:

1. **Presentation Layer:** React displays the interface and collects user input.
2. **Application Layer:** Node.js and Express process requests, apply application logic, and communicate with the database.
3. **Data Layer:** MongoDB stores and retrieves business information through Mongoose.

The frontend communicates with the backend through API endpoints. The backend processes the requests and returns responses that the frontend uses to update the interface.

## 7. Workflow

1. Start the frontend and backend services.
2. Connect the backend to MongoDB.
3. Log in to the application.
4. Enter sales, expenses, and customer credit transactions.
5. Store and retrieve records through the backend API.
6. Manage customer debts, cheques, bank estimates, and notes.
7. View dashboard summaries and charts.
8. Filter reports and export transaction records when required.

## 8. Database and Data Management

MongoDB is used to store the application's business information. Mongoose provides models and database operations for the backend.

Transaction records include information such as transaction type, amount, payment method, notes, and date. Other modules maintain their respective records, including customer debts, cheque information, and owner notes.

The exact fields and relationships depend on the models implemented in the project.

## 9. Advantages

- Centralizes multiple business activities.
- Reduces dependence on handwritten records.
- Makes customer dues easier to monitor.
- Helps owners remember upcoming cheque payments.
- Provides a quick overview of sales and expenses.
- Supports report filtering and CSV export.
- Can be extended with additional business features.

## 10. Limitations

- The accuracy of summaries depends on the correctness of entered data.
- Bank balance figures are estimates and should not be treated as verified live bank balances unless a bank integration is implemented.
- Payment identification is not automatic unless a supported integration is added.
- The current feature set focuses on business records rather than complete accounting or tax compliance.

## 11. Future Enhancements

Potential improvements include inventory management, low-stock notifications, automated reminders for customer dues, payment gateway integration, cloud deployment, scheduled backups, employee accounts, and advanced monthly and yearly analytics.

## 12. Conclusion

DukaanTrack demonstrates how full-stack web development can be used to address practical retail business management needs. By combining transaction recording, debtor management, cheque tracking, dashboard summaries, and reporting, the application provides a foundation for more organized retail operations.

The modular design also allows new features to be introduced as business requirements grow.
