class User {
  final String id;
  final String email;
  final String fullName;
  final String? phone;
  final List<String> roles;
  final String status;
  final String createdAt;

  const User({
    required this.id,
    required this.email,
    required this.fullName,
    required this.phone,
    required this.roles,
    required this.status,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        email: json['email'] as String,
        fullName: json['fullName'] as String,
        phone: json['phone'] as String?,
        roles: (json['roles'] as List).cast<String>(),
        status: json['status'] as String,
        createdAt: json['createdAt'] as String,
      );

  bool hasRole(String role) => roles.contains(role);
}
