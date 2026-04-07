// Quick manual test - run this in browser console
// First, get a valid JWT token from your localStorage

const token = localStorage.getItem('token'); // or however your app stores it
const employeeId = '30020004'; // Use any employee ID from the database
const skill = 'Test Skill ' + Date.now();

console.log('Token:', token?.substring(0, 20) + '...');
console.log('Employee ID:', employeeId);
console.log('Skill:', skill);

fetch(`http://localhost:5000/employees/${employeeId}/skill`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ skill })
})
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('Response:', data);
  })
  .catch(err => {
    console.error('Error:', err);
  });
