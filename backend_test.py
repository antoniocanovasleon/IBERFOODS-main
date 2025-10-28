import os
import requests
import sys
import json
from datetime import datetime
from pathlib import Path

class CompanyManagementAPITester:
    def __init__(self, base_url=None):
        env_base_url = os.getenv("BACKEND_BASE_URL")
        resolved_base_url = base_url or env_base_url or "http://localhost:8000/api"
        self.base_url = resolved_base_url.rstrip("/")
        self.token = None
        self.admin_token = None
        self.regular_token = None
        self.user_id = None
        self.admin_user_id = None
        self.regular_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, use_admin=False, use_regular=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        # Choose token based on parameters
        if use_admin and self.admin_token:
            token_to_use = self.admin_token
        elif use_regular and self.regular_token:
            token_to_use = self.regular_token
        elif not use_admin and not use_regular:
            token_to_use = self.token
        else:
            token_to_use = None
            
        if token_to_use:
            headers['Authorization'] = f'Bearer {token_to_use}'

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json() if response.text else {}
                except:
                    return True, {}
            else:
                error_detail = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_response = response.json()
                    error_detail += f" - {error_response.get('detail', '')}"
                except:
                    error_detail += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_detail)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "email": f"testuser_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}",
            "role": "user"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_admin_login(self):
        """Test admin login with existing credentials"""
        admin_data = {
            "email": "export@iberfoods.com",
            "password": "Koloro.0364"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=admin_data
        )
        
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            self.admin_user_id = response['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            return False
            
        # We'll test with the registered user
        login_data = {
            "email": f"testuser_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_calendar_event(self):
        """Test creating a calendar event"""
        event_data = {
            "title": "Test Event",
            "description": "Test event description",
            "date": "2024-12-25",
            "event_type": "pedido",
            "custom_fields": {
                "numero_pedido": "PED-001",
                "cliente": "Test Client"
            }
        }
        
        success, response = self.run_test(
            "Create Calendar Event",
            "POST",
            "calendar",
            200,
            data=event_data
        )
        
        if success and 'id' in response:
            self.event_id = response['id']
            return True
        return False

    def test_get_calendar_events(self):
        """Test getting calendar events"""
        success, response = self.run_test(
            "Get Calendar Events",
            "GET",
            "calendar",
            200
        )
        return success

    def test_update_calendar_event(self):
        """Test updating a calendar event"""
        if not hasattr(self, 'event_id'):
            return False
            
        update_data = {
            "title": "Updated Test Event",
            "description": "Updated description",
            "date": "2024-12-26",
            "event_type": "albaran",
            "custom_fields": {
                "numero_albaran": "ALB-001"
            }
        }
        
        success, response = self.run_test(
            "Update Calendar Event",
            "PUT",
            f"calendar/{self.event_id}",
            200,
            data=update_data
        )
        return success

    def test_delete_calendar_event(self):
        """Test deleting a calendar event"""
        if not hasattr(self, 'event_id'):
            return False
            
        success, response = self.run_test(
            "Delete Calendar Event",
            "DELETE",
            f"calendar/{self.event_id}",
            200
        )
        return success

    def test_create_kanban_task(self):
        """Test creating a kanban task"""
        task_data = {
            "title": "Test Task",
            "description": "Test task description",
            "priority": "high",
            "assigned_to": "Test User"
        }
        
        success, response = self.run_test(
            "Create Kanban Task",
            "POST",
            "kanban",
            200,
            data=task_data
        )
        
        if success and 'id' in response:
            self.task_id = response['id']
            return True
        return False

    def test_get_kanban_tasks(self):
        """Test getting kanban tasks"""
        success, response = self.run_test(
            "Get Kanban Tasks",
            "GET",
            "kanban",
            200
        )
        return success

    def test_update_kanban_task(self):
        """Test updating a kanban task"""
        if not hasattr(self, 'task_id'):
            return False
            
        update_data = {
            "status": "in_progress",
            "title": "Updated Test Task",
            "priority": "medium"
        }
        
        success, response = self.run_test(
            "Update Kanban Task",
            "PUT",
            f"kanban/{self.task_id}",
            200,
            data=update_data
        )
        return success

    def test_delete_kanban_task(self):
        """Test deleting a kanban task"""
        if not hasattr(self, 'task_id'):
            return False
            
        success, response = self.run_test(
            "Delete Kanban Task",
            "DELETE",
            f"kanban/{self.task_id}",
            200
        )
        return success

    # Task Types Tests
    def test_create_task_type_admin(self):
        """Test creating a task type (admin only)"""
        task_type_data = {
            "name": "Development",
            "color": "#3B82F6"
        }
        
        success, response = self.run_test(
            "Create Task Type (Admin)",
            "POST",
            "task-types",
            200,
            data=task_type_data,
            use_admin=True
        )
        
        if success and 'id' in response:
            self.task_type_id = response['id']
            # Verify response structure
            required_fields = ['id', 'name', 'color', 'created_by', 'created_at']
            for field in required_fields:
                if field not in response:
                    self.log_test("Task Type Response Structure", False, f"Missing field: {field}")
                    return False
            return True
        return False

    def test_create_task_type_unauthorized(self):
        """Test creating a task type with regular user (should fail)"""
        task_type_data = {
            "name": "Unauthorized Type",
            "color": "#FF0000"
        }
        
        success, response = self.run_test(
            "Create Task Type (Unauthorized)",
            "POST",
            "task-types",
            403,  # Should be forbidden
            data=task_type_data,
            use_admin=False
        )
        return success

    def test_get_task_types(self):
        """Test getting all task types"""
        success, response = self.run_test(
            "Get Task Types",
            "GET",
            "task-types",
            200
        )
        
        if success and isinstance(response, list):
            # Verify each task type has required fields
            for task_type in response:
                required_fields = ['id', 'name', 'color', 'created_by']
                for field in required_fields:
                    if field not in task_type:
                        self.log_test("Task Types List Structure", False, f"Missing field: {field}")
                        return False
            return True
        return success

    def test_update_task_type_admin(self):
        """Test updating a task type (admin only)"""
        if not hasattr(self, 'task_type_id'):
            return False
            
        update_data = {
            "name": "Updated Development",
            "color": "#10B981"
        }
        
        success, response = self.run_test(
            "Update Task Type (Admin)",
            "PUT",
            f"task-types/{self.task_type_id}",
            200,
            data=update_data,
            use_admin=True
        )
        return success

    def test_update_task_type_unauthorized(self):
        """Test updating a task type with regular user (should fail)"""
        if not hasattr(self, 'task_type_id'):
            return False
            
        update_data = {
            "name": "Unauthorized Update",
            "color": "#FF0000"
        }
        
        success, response = self.run_test(
            "Update Task Type (Unauthorized)",
            "PUT",
            f"task-types/{self.task_type_id}",
            403,  # Should be forbidden
            data=update_data,
            use_admin=False
        )
        return success

    def test_create_kanban_task_with_type(self):
        """Test creating a kanban task with task_type_id"""
        if not hasattr(self, 'task_type_id'):
            return False
            
        task_data = {
            "title": "Task with Type",
            "description": "Test task with task type",
            "priority": "high",
            "assigned_to": "Developer User",
            "task_type_id": self.task_type_id
        }
        
        success, response = self.run_test(
            "Create Kanban Task with Type",
            "POST",
            "kanban",
            200,
            data=task_data
        )
        
        if success and 'id' in response:
            self.typed_task_id = response['id']
            # Verify task_type_id is included in response
            if response.get('task_type_id') != self.task_type_id:
                self.log_test("Task Type ID Verification", False, "task_type_id not properly saved")
                return False
            return True
        return False

    def test_create_kanban_task_without_type(self):
        """Test creating a kanban task without task_type_id (should work)"""
        task_data = {
            "title": "Task without Type",
            "description": "Test task without task type",
            "priority": "medium",
            "assigned_to": "Regular User"
        }
        
        success, response = self.run_test(
            "Create Kanban Task without Type",
            "POST",
            "kanban",
            200,
            data=task_data
        )
        
        if success and 'id' in response:
            self.untyped_task_id = response['id']
            # Verify task_type_id is null or not present
            if response.get('task_type_id') is not None:
                self.log_test("Task without Type Verification", False, "task_type_id should be null")
                return False
            return True
        return False

    def test_update_kanban_task_with_type(self):
        """Test updating a kanban task to add task_type_id"""
        if not hasattr(self, 'untyped_task_id') or not hasattr(self, 'task_type_id'):
            return False
            
        update_data = {
            "task_type_id": self.task_type_id
        }
        
        success, response = self.run_test(
            "Update Kanban Task with Type",
            "PUT",
            f"kanban/{self.untyped_task_id}",
            200,
            data=update_data
        )
        
        if success and response.get('task_type_id') == self.task_type_id:
            return True
        elif success:
            self.log_test("Task Type Update Verification", False, "task_type_id not properly updated")
            return False
        return success

    def test_get_kanban_tasks_with_types(self):
        """Test getting kanban tasks and verify task_type_id is included"""
        success, response = self.run_test(
            "Get Kanban Tasks with Types",
            "GET",
            "kanban",
            200
        )
        
        if success and isinstance(response, list):
            # Find our typed task and verify it has task_type_id
            typed_task_found = False
            for task in response:
                if hasattr(self, 'typed_task_id') and task.get('id') == self.typed_task_id:
                    typed_task_found = True
                    if task.get('task_type_id') != self.task_type_id:
                        self.log_test("Typed Task Verification", False, "task_type_id not properly returned")
                        return False
            
            if hasattr(self, 'typed_task_id') and not typed_task_found:
                self.log_test("Typed Task Found", False, "Created typed task not found in list")
                return False
            return True
        return success

    def test_delete_task_type_with_tasks(self):
        """Test deleting a task type that has associated tasks (should handle gracefully)"""
        if not hasattr(self, 'task_type_id'):
            return False
            
        success, response = self.run_test(
            "Delete Task Type with Associated Tasks",
            "DELETE",
            f"task-types/{self.task_type_id}",
            200,
            use_admin=True
        )
        return success

    def test_delete_task_type_unauthorized(self):
        """Test deleting a task type with regular user (should fail)"""
        # Create a new task type first for this test
        task_type_data = {
            "name": "Test Delete Type",
            "color": "#EF4444"
        }
        
        success, response = self.run_test(
            "Create Task Type for Delete Test",
            "POST",
            "task-types",
            200,
            data=task_type_data,
            use_admin=True
        )
        
        if not success or 'id' not in response:
            return False
            
        delete_type_id = response['id']
        
        success, response = self.run_test(
            "Delete Task Type (Unauthorized)",
            "DELETE",
            f"task-types/{delete_type_id}",
            403,  # Should be forbidden
            use_admin=False
        )
        
        # Clean up - delete with admin
        if success:  # If the unauthorized test passed (returned 403 as expected)
            self.run_test(
                "Cleanup Delete Task Type",
                "DELETE",
                f"task-types/{delete_type_id}",
                200,
                use_admin=True
            )
        
        return success

    def cleanup_test_data(self):
        """Clean up test data created during tests"""
        # Clean up tasks
        if hasattr(self, 'typed_task_id'):
            self.run_test(
                "Cleanup Typed Task",
                "DELETE",
                f"kanban/{self.typed_task_id}",
                200
            )
        
        if hasattr(self, 'untyped_task_id'):
            self.run_test(
                "Cleanup Untyped Task", 
                "DELETE",
                f"kanban/{self.untyped_task_id}",
                200
            )

    def test_get_users_admin(self):
        """Test getting users list (admin only)"""
        success, response = self.run_test(
            "Get Users (Admin)",
            "GET",
            "users",
            200,
            use_admin=True
        )
        return success

    def test_get_users_unauthorized(self):
        """Test getting users list with regular user (should fail)"""
        success, response = self.run_test(
            "Get Users (Unauthorized)",
            "GET",
            "users",
            403,  # Should be forbidden
            use_regular=True
        )
        return success

    def test_regular_user_login(self):
        """Test regular user login with existing credentials"""
        user_data = {
            "email": "test.backend@example.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "Regular User Login",
            "POST",
            "auth/login",
            200,
            data=user_data
        )
        
        if success and 'access_token' in response:
            self.regular_token = response['access_token']
            self.regular_user_id = response['user']['id']
            return True
        return False

    def test_create_user_admin(self):
        """Test creating a user (admin only)"""
        timestamp = datetime.now().strftime('%H%M%S%f')
        user_data = {
            "name": "Test User Backend",
            "email": f"test.backend.{timestamp}@example.com",
            "password": "testpass123",
            "role": "user"
        }
        
        success, response = self.run_test(
            "Create User (Admin)",
            "POST",
            "users",
            200,
            data=user_data,
            use_admin=True
        )
        
        if success and 'id' in response:
            self.created_user_id = response['id']
            # Verify response structure
            required_fields = ['id', 'email', 'name', 'role', 'created_at']
            for field in required_fields:
                if field not in response:
                    self.log_test("User Response Structure", False, f"Missing field: {field}")
                    return False
            
            # Verify password is not in response
            if 'password' in response or 'password_hash' in response:
                self.log_test("Password Security Check", False, "Password found in response")
                return False
            
            return True
        return False

    def test_create_user_unauthorized(self):
        """Test creating a user with regular user (should fail)"""
        user_data = {
            "name": "Unauthorized User",
            "email": "unauthorized@example.com",
            "password": "testpass123",
            "role": "user"
        }
        
        # Test with regular user token
        success, response = self.run_test(
            "Create User (Unauthorized - Regular User)",
            "POST",
            "users",
            403,  # Should be forbidden
            data=user_data,
            use_regular=True
        )
        
        return success

    def test_create_user_no_auth(self):
        """Test creating a user without authentication (should fail)"""
        user_data = {
            "name": "No Auth User",
            "email": "noauth@example.com",
            "password": "testpass123",
            "role": "user"
        }
        
        # Temporarily remove token
        original_token = self.token
        self.token = None
        
        success, response = self.run_test(
            "Create User (No Auth)",
            "POST",
            "users",
            403,  # FastAPI HTTPBearer returns 403 when no token provided
            data=user_data,
            use_admin=False
        )
        
        # Restore token
        self.token = original_token
        return success

    def test_create_user_duplicate_email(self):
        """Test creating a user with duplicate email (should fail)"""
        user_data = {
            "name": "Duplicate Email User",
            "email": "export@iberfoods.com",  # Admin's email
            "password": "testpass123",
            "role": "user"
        }
        
        success, response = self.run_test(
            "Create User (Duplicate Email)",
            "POST",
            "users",
            400,  # Should be bad request
            data=user_data,
            use_admin=True
        )
        
        return success

    def test_update_user_admin(self):
        """Test updating a user (admin only)"""
        if not hasattr(self, 'created_user_id'):
            return False
            
        update_data = {
            "name": "Updated Name",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "Update User (Admin)",
            "PUT",
            f"users/{self.created_user_id}",
            200,
            data=update_data,
            use_admin=True
        )
        
        if success:
            # Verify updated fields
            if response.get('name') != "Updated Name" or response.get('role') != "admin":
                self.log_test("User Update Verification", False, "Fields not properly updated")
                return False
        
        return success

    def test_update_user_with_password(self):
        """Test updating a user with password (admin only)"""
        if not hasattr(self, 'created_user_id'):
            return False
            
        update_data = {
            "name": "Test User",
            "password": "newpass123"
        }
        
        success, response = self.run_test(
            "Update User with Password (Admin)",
            "PUT",
            f"users/{self.created_user_id}",
            200,
            data=update_data,
            use_admin=True
        )
        
        if success:
            # Verify password is not in response
            if 'password' in response or 'password_hash' in response:
                self.log_test("Password Security Check (Update)", False, "Password found in response")
                return False
        
        return success

    def test_update_user_without_password(self):
        """Test updating a user without password (admin only)"""
        if not hasattr(self, 'created_user_id'):
            return False
            
        update_data = {
            "name": "Test Again"
        }
        
        success, response = self.run_test(
            "Update User without Password (Admin)",
            "PUT",
            f"users/{self.created_user_id}",
            200,
            data=update_data,
            use_admin=True
        )
        
        return success

    def test_update_user_unauthorized(self):
        """Test updating a user with regular user (should fail)"""
        if not hasattr(self, 'created_user_id'):
            return False
            
        update_data = {
            "name": "Unauthorized Update",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "Update User (Unauthorized)",
            "PUT",
            f"users/{self.created_user_id}",
            403,  # Should be forbidden
            data=update_data,
            use_regular=True
        )
        
        return success

    def test_update_user_not_found(self):
        """Test updating a non-existent user (should fail)"""
        update_data = {
            "name": "Non-existent User"
        }
        
        success, response = self.run_test(
            "Update User (Not Found)",
            "PUT",
            "users/non-existent-id",
            404,  # Should be not found
            data=update_data,
            use_admin=True
        )
        
        return success

    def test_delete_user_admin(self):
        """Test deleting a user (admin only)"""
        if not hasattr(self, 'created_user_id'):
            return False
            
        success, response = self.run_test(
            "Delete User (Admin)",
            "DELETE",
            f"users/{self.created_user_id}",
            200,
            use_admin=True
        )
        
        if success:
            # Verify success message
            if not response.get('message') or 'deleted successfully' not in response.get('message', ''):
                self.log_test("Delete User Message Check", False, "Expected success message not found")
                return False
        
        return success

    def test_delete_user_unauthorized(self):
        """Test deleting a user with regular user (should fail)"""
        # Create a user first for this test
        user_data = {
            "name": "Delete Test User",
            "email": "deletetest@example.com",
            "password": "testpass123",
            "role": "user"
        }
        
        success, response = self.run_test(
            "Create User for Delete Test",
            "POST",
            "users",
            200,
            data=user_data,
            use_admin=True
        )
        
        if not success or 'id' not in response:
            return False
            
        delete_user_id = response['id']
        
        success, response = self.run_test(
            "Delete User (Unauthorized)",
            "DELETE",
            f"users/{delete_user_id}",
            403,  # Should be forbidden
            use_regular=True
        )
        
        # Clean up - delete with admin
        if success:  # If the unauthorized test passed (returned 403 as expected)
            self.run_test(
                "Cleanup Delete User",
                "DELETE",
                f"users/{delete_user_id}",
                200,
                use_admin=True
            )
        
        return success

    def test_delete_user_not_found(self):
        """Test deleting a non-existent user (should fail)"""
        success, response = self.run_test(
            "Delete User (Not Found)",
            "DELETE",
            "users/non-existent-id",
            404,  # Should be not found
            use_admin=True
        )
        
        return success

    def test_verify_user_deleted(self):
        """Test that deleted user is not in users list"""
        if not hasattr(self, 'created_user_id'):
            return True  # Skip if no user was created
            
        success, response = self.run_test(
            "Get Users After Delete",
            "GET",
            "users",
            200,
            use_admin=True
        )
        
        if success and isinstance(response, list):
            # Check that deleted user is not in the list
            for user in response:
                if user.get('id') == self.created_user_id:
                    self.log_test("User Deletion Verification", False, "Deleted user still found in list")
                    return False
            return True
        
        return success

    def test_get_users_structure(self):
        """Test that users list has correct structure"""
        success, response = self.run_test(
            "Get Users Structure Check",
            "GET",
            "users",
            200,
            use_admin=True
        )
        
        if success and isinstance(response, list):
            # Verify each user has required fields
            required_fields = ['id', 'email', 'name', 'role', 'created_at']
            for user in response:
                for field in required_fields:
                    if field not in user:
                        self.log_test("Users List Structure", False, f"Missing field: {field}")
                        return False
                
                # Verify password is not in response
                if 'password' in user or 'password_hash' in user:
                    self.log_test("Users Password Security", False, "Password found in user list")
                    return False
            
            return True
        
        return success

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Company Management API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)

        # Authentication tests
        print("\n📋 AUTHENTICATION TESTS")
        if not self.test_user_registration():
            print("❌ User registration failed, stopping tests")
            return False
            
        if not self.test_admin_login():
            print("❌ Admin login failed, continuing with limited tests")
            
        self.test_get_current_user()

        # Calendar tests
        print("\n📅 CALENDAR TESTS")
        if self.test_create_calendar_event():
            self.test_get_calendar_events()
            self.test_update_calendar_event()
            self.test_delete_calendar_event()
        else:
            print("❌ Calendar event creation failed, skipping related tests")

        # Kanban tests
        print("\n📋 KANBAN TESTS")
        if self.test_create_kanban_task():
            self.test_get_kanban_tasks()
            self.test_update_kanban_task()
            self.test_delete_kanban_task()
        else:
            print("❌ Kanban task creation failed, skipping related tests")

        # Task Types tests
        print("\n🏷️  TASK TYPES TESTS")
        if self.admin_token:
            if self.test_create_task_type_admin():
                self.test_get_task_types()
                self.test_update_task_type_admin()
                self.test_update_task_type_unauthorized()
                
                # Test kanban integration with task types
                print("\n📋 KANBAN + TASK TYPES INTEGRATION")
                self.test_create_kanban_task_with_type()
                self.test_create_kanban_task_without_type()
                self.test_update_kanban_task_with_type()
                self.test_get_kanban_tasks_with_types()
                
                # Test access control
                self.test_delete_task_type_unauthorized()
                self.test_delete_task_type_with_tasks()
            else:
                print("❌ Task type creation failed, skipping related tests")
        else:
            print("❌ No admin token available, skipping task type tests")
            
        # Test unauthorized access
        self.test_create_task_type_unauthorized()

        # User Management tests
        print("\n👥 USER MANAGEMENT TESTS")
        
        # First login regular user for access control tests
        self.test_regular_user_login()
        
        if self.admin_token:
            # Test admin access to users list
            self.test_get_users_admin()
            self.test_get_users_structure()
            
            # Test user creation
            if self.test_create_user_admin():
                # Test user updates
                self.test_update_user_admin()
                self.test_update_user_with_password()
                self.test_update_user_without_password()
                
                # Test user deletion
                self.test_delete_user_admin()
                self.test_verify_user_deleted()
            
            # Test error cases
            self.test_create_user_duplicate_email()
            self.test_update_user_not_found()
            self.test_delete_user_not_found()
            
            # Test access control with regular user
            self.test_create_user_unauthorized()
            self.test_update_user_unauthorized()
            self.test_delete_user_unauthorized()
            
            # Test no authentication
            self.test_create_user_no_auth()
        else:
            print("❌ No admin token available, skipping admin user management tests")
        
        # Test unauthorized access (should work even without admin token)
        self.test_get_users_unauthorized()

        # Cleanup
        print("\n🧹 CLEANUP")
        self.cleanup_test_data()

        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 FINAL RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = CompanyManagementAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    reports_dir_env = os.getenv("BACKEND_TEST_REPORT_DIR")
    reports_dir = Path(reports_dir_env) if reports_dir_env else Path(__file__).parent / "test_reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    report_file = reports_dir / "backend_test_results.json"

    with report_file.open('w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
            'results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())