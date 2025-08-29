---
apply: always
---

# AI Agent Coding Principles

## 🎯 Core Philosophy
- **Write code that humans can understand, not just machines can execute**
- **Prioritize maintainability and readability over cleverness**
- **Follow DRY (Don't Repeat Yourself) but not at the expense of clarity**
- **Make the simple things simple and the complex things possible**

## 📋 General Principles

### 1. Code Style & Formatting
- Use 2 spaces for indentation (no tabs)
- Maximum line length: 100 characters
- Use semicolons consistently in JavaScript/TypeScript
- Follow camelCase for variables/functions, PascalCase for classes/components
- Use UPPER_SNAKE_CASE for constants
- Always use meaningful and descriptive names

### 2. Comments & Documentation
- Write self-documenting code that doesn't need excessive comments
- Add comments only to explain "why", not "what"
- Use JSDoc for public APIs and complex functions
- Include examples in documentation when helpful

### 3. Error Handling
- Never ignore or suppress errors silently
- Always provide meaningful error messages
- Use try-catch blocks appropriately
- Log errors with proper context and stack traces
- Create custom error classes for domain-specific errors

## 🚀 ExpressJS Principles

### 1. Application Structure
```javascript
// Follow modular structure
src/
  ├── controllers/    // Request handlers
  ├── services/       // Business logic
  ├── repositories/   // Data access layer
  ├── middlewares/    // Custom middleware
  ├── routes/         // Route definitions
  ├── entities/       // TypeORM entities
  ├── utils/          // Helper functions
  └── config/         // Configuration files
```

### 2. Route Handling
- Keep controllers thin, move logic to services
- Always validate input data
- Use proper HTTP status codes
- Implement consistent error response format

```javascript
// Good example
router.post('/users', validateUser, async (req, res, next) => {
  try {
    const user = await userService.create(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});
```

### 3. Middleware Best Practices
- Order matters: error handling should be last
- Create reusable middleware functions
- Use async/await with proper error handling
- Implement request logging and monitoring

### 4. Security
- Always validate and sanitize input
- Use helmet.js for security headers
- Implement rate limiting
- Never expose sensitive information in responses
- Use environment variables for secrets

## 🗄️ PostgreSQL & TypeORM Principles

### 1. Database Design
- Follow database normalization principles (at least 3NF)
- Use appropriate indexes for frequently queried columns
- Implement proper foreign key constraints
- Use transactions for data consistency
- Plan for database migrations from the start

### 2. TypeORM Entity Design
```typescript
// Good entity example
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Post, post => post.user)
  posts: Post[];
}
```

### 3. Query Optimization
- Use QueryBuilder for complex queries
- Avoid N+1 queries with proper joins
- Use pagination for large datasets
- Cache frequently accessed data
- Monitor query performance

### 4. Repository Pattern
```javascript
// Implement clean repository pattern
class UserRepository {
  async findByEmail(email) {
    return this.repository.findOne({ where: { email } });
  }

  async createUser(userData) {
    const user = this.repository.create(userData);
    return this.repository.save(user);
  }
}
```

## ⚛️ React Principles

### 1. Component Design
- Prefer functional components with hooks
- Keep components small and focused (Single Responsibility)
- Use composition over inheritance
- Separate presentational and container components

```javascript
// Good component example
const UserCard = ({ user, onEdit, onDelete }) => {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      <button onClick={() => onEdit(user.id)}>Edit</button>
      <button onClick={() => onDelete(user.id)}>Delete</button>
    </div>
  );
};
```

### 2. State Management
- Use local state when possible
- Lift state up only when necessary
- Consider Context API for cross-cutting concerns
- Use proper state management library for complex apps (Redux, Zustand)
- Avoid unnecessary re-renders

### 3. Hooks Best Practices
- Follow Rules of Hooks
- Create custom hooks for reusable logic
- Use useMemo and useCallback wisely
- Keep effects clean with proper cleanup

```javascript
// Custom hook example
const useUser = (userId) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await userService.getUser(userId);
        setUser(data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  return { user, loading, error };
};
```

### 4. Performance
- Lazy load components and routes
- Optimize images and assets
- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Monitor bundle size

## 🧪 Testing Principles

### 1. Test Coverage
- Aim for 80% code coverage minimum
- Test critical business logic thoroughly
- Write integration tests for APIs
- Include edge cases and error scenarios

### 2. Testing Patterns
```javascript
// Good test example
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = { name: 'John', email: 'john@example.com' };
      const user = await userService.createUser(userData);
      
      expect(user).toHaveProperty('id');
      expect(user.email).toBe(userData.email);
    });

    it('should throw error for duplicate email', async () => {
      await expect(userService.createUser(duplicateData))
        .rejects.toThrow('Email already exists');
    });
  });
});
```

## 🔄 API Design Principles

### 1. RESTful Conventions
- Use proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Follow consistent URL patterns
- Version your APIs (/api/v1/)
- Implement proper pagination, filtering, and sorting

### 2. Response Format
```javascript
// Consistent response structure
{
  "success": true,
  "data": { /* actual data */ },
  "message": "Operation successful",
  "timestamp": "2025-08-28T07:37:28Z"
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [ /* specific errors */ ]
  },
  "timestamp": "2025-08-28T07:37:28Z"
}
```

## 🛡️ Security Best Practices

### 1. Authentication & Authorization
- Implement JWT with proper expiration
- Use refresh tokens for long sessions
- Store sensitive data encrypted
- Implement role-based access control (RBAC)

### 2. Input Validation
```javascript
// Use validation middleware
const validateUser = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/[A-Z]/),
  body('age').isInt({ min: 0, max: 120 }),
  handleValidationErrors
];
```

### 3. SQL Injection Prevention
- Always use parameterized queries
- Never concatenate user input into queries
- Validate and sanitize all inputs
- Use TypeORM's built-in protection

## 📦 Dependency Management

### 1. Package Selection
- Choose well-maintained packages
- Check for security vulnerabilities
- Prefer packages with TypeScript support
- Keep dependencies up to date
- Audit dependencies regularly

### 2. Version Control
- Use exact versions in production
- Document breaking changes
- Test thoroughly after updates
- Keep a changelog

## 🚀 Deployment & DevOps

### 1. Environment Management
- Use .env files for configuration
- Never commit secrets to repository
- Maintain separate configs for dev/staging/production
- Use environment-specific databases

### 2. Logging & Monitoring
```javascript
// Implement structured logging
logger.info('User created', {
  userId: user.id,
  email: user.email,
  timestamp: new Date().toISOString(),
  requestId: req.id
});
```

### 3. Performance Monitoring
- Monitor API response times
- Track database query performance
- Set up alerts for errors
- Use APM tools for production

## 📝 Code Review Checklist

Before submitting code, ensure:
- [ ] Code follows naming conventions
- [ ] No console.logs in production code
- [ ] Proper error handling implemented
- [ ] Security vulnerabilities addressed
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Performance impact considered
- [ ] Database migrations included if needed
- [ ] Environment variables documented
  - [ ]BREAKING changes noted

## 🎓 Learning & Improvement

### 1. Stay Updated
- Follow official documentation changes
- Learn new patterns and best practices
- Review and refactor old code
- Share knowledge with team

### 2. Performance Optimization
- Profile before optimizing
- Measure impact of changes
- Focus on bottlenecks first
- Consider caching strategies

## 🤝 Collaboration Principles

### 1. Git Workflow
- Write clear commit messages
- Keep commits atomic and focused
- Use feature branches
- Review code before merging

### 2. Communication
- Document architectural decisions
- Explain complex logic in PRs
- Ask for help when stuck
- Share learnings with team

---

**Remember**: These principles are guidelines, not rigid rules. Use judgment and adapt based on specific project needs. The goal is to write maintainable, scalable, and secure code that delivers value to users.