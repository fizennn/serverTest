// Main initialization function
function init() {
    try {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const token = urlParams.get('token');
        
        if (!userId || !token) {
            showError('Thiếu thông tin cần thiết để kích hoạt tài khoản');
            return;
        }
        
        // Start activation process
        activateAccount(userId, token);
        
    } catch (error) {
        showError('Lỗi JavaScript: ' + error.message);
    }
}

async function activateAccount(userId, token) {
    try {
        const baseUrl = window.location.origin;
        const apiUrl = `${baseUrl}/v1/auth/activate?userId=${userId}&token=${token}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (response.ok) {
            showSuccess(data.message || 'Kích hoạt tài khoản thành công!');
        } else {
            showError(data.message || 'Kích hoạt tài khoản thất bại');
        }
        
    } catch (error) {
        showError('Đã xảy ra lỗi kết nối. Vui lòng thử lại sau.');
    }
}

function showSuccess(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('success').classList.remove('hidden');
    document.getElementById('success-message').textContent = message;
}

function showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
}

// Start the initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
