import 'package:flutter/material.dart';
import '../app/app_theme.dart';

/// The teal "MC" badge — same mark as the website's `.site-logo__mark` (frontend/src/layouts/
/// MainLayout.css), shown wherever the app wants a branded header (splash, login, register).
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 56});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(size * 0.28)),
      alignment: Alignment.center,
      child: Text('MC', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: size * 0.36)),
    );
  }
}
