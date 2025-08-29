---
applyTo: '**'
---
# Coding Principles

When contributing code, please adhere to the following coding principles to ensure consistency and maintainability across the project:

* **`*.routes.js`**: **ONLY** defines API endpoints and maps them to controller methods. It contains no business logic.
* **`*.controller.js`**: **ONLY** handles the HTTP request (`req`) and response (`res`). It validates input (DTOs), calls the appropriate service method, and formats the final HTTP response. It MUST NOT contain business logic or database queries.
* **`*.service.js`**: **CONTAINS ALL** business logic. It orchestrates data from one or more repositories and performs computations, authorization checks, and complex operations. It is completely decoupled from the HTTP layer.
* **`*.repository.js`**: **ONLY** handles direct interaction with the database via TypeORM. It contains all the data access logic (CRUD operations, complex queries). This is the only layer allowed to import TypeORM entities.
