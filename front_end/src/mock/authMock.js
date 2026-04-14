const mockUsers = [
  {
    id: "admin-001",
    email: "admin@example.com",
    phone: "0900000001",
    password: "12345678",
    status: "ACTIVE",
    roles: ["admin"],
    profile: {
      fullName: "System Admin",
      avatar: "",
      companyName: "Affiliate Platform",
    },
  },
  {
    id: "seller-001",
    email: "seller@example.com",
    phone: "0900000002",
    password: "12345678",
    status: "APPROVED",
    roles: ["seller"],
    profile: {
      fullName: "Demo Seller",
      avatar: "",
      shopName: "Seller Demo Store",
    },
  },
  {
    id: "affiliate-001",
    email: "affiliate@example.com",
    phone: "0900000003",
    password: "12345678",
    status: "APPROVED",
    roles: ["affiliate"],
    profile: {
      fullName: "Demo Affiliate",
      avatar: "",
      channelName: "Affiliate Channel",
    },
  },
  {
    id: "customer-001",
    email: "customer@example.com",
    phone: "0900000004",
    password: "12345678",
    status: "ACTIVE",
    roles: ["customer"],
    profile: {
      fullName: "Demo Customer",
      avatar: "",
      defaultAddress: "Ho Chi Minh City",
    },
  },
];

const MOCK_DELAY = 350;

function wait(duration = MOCK_DELAY) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function createToken(prefix, userId) {
  return `${prefix}-${userId}-${Date.now()}`;
}

async function mockLogin(payload) {
  await wait();

  const email = payload.email?.trim() || "";
  const password = payload.password?.trim() || "";

  const matchedUser = mockUsers.find((user) => user.email === email && user.password === password);

  if (!matchedUser) {
    const error = new Error("Invalid credentials");
    error.response = {
      status: 401,
      data: {
        message: "Email hoac mat khau khong dung.",
      },
    };
    throw error;
  }

  return {
    accessToken: createToken("mock-access", matchedUser.id),
    refreshToken: createToken("mock-refresh", matchedUser.id),
    currentUser: sanitizeUser(matchedUser),
    roles: matchedUser.roles,
  };
}

async function mockRefreshToken(refreshToken) {
  await wait(200);

  if (!refreshToken?.startsWith("mock-refresh-")) {
    const error = new Error("Invalid refresh token");
    error.response = {
      status: 401,
      data: {
        message: "Refresh token khong hop le.",
      },
    };
    throw error;
  }

  const userId = refreshToken.split("-").slice(2, -1).join("-");
  const matchedUser = mockUsers.find((user) => user.id === userId);

  if (!matchedUser) {
    const error = new Error("User not found");
    error.response = {
      status: 404,
      data: {
        message: "Khong tim thay nguoi dung.",
      },
    };
    throw error;
  }

  return {
    accessToken: createToken("mock-access", matchedUser.id),
    refreshToken: createToken("mock-refresh", matchedUser.id),
    currentUser: sanitizeUser(matchedUser),
    roles: matchedUser.roles,
  };
}

async function mockGetCurrentUser(accessToken) {
  await wait(150);

  if (!accessToken?.startsWith("mock-access-")) {
    const error = new Error("Unauthorized");
    error.response = {
      status: 401,
      data: {
        message: "Access token khong hop le.",
      },
    };
    throw error;
  }

  const userId = accessToken.split("-").slice(2, -1).join("-");
  const matchedUser = mockUsers.find((user) => user.id === userId);

  if (!matchedUser) {
    const error = new Error("User not found");
    error.response = {
      status: 404,
      data: {
        message: "Khong tim thay nguoi dung.",
      },
    };
    throw error;
  }

  return sanitizeUser(matchedUser);
}

async function mockLogout() {
  await wait(100);

  return {
    success: true,
  };
}

export { mockGetCurrentUser, mockLogin, mockLogout, mockRefreshToken, mockUsers };
