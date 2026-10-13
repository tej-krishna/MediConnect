import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mediconnect/main.dart';

/// A real end-to-end auth-flow check (login screen -> real backend -> home screen) belongs to
/// manual verification against a live server, same as every website phase's browser pass — a
/// plain `flutter test` widget sandbox has no real backend to call and no reliable way to await a
/// real socket's connection-refused/timeout on a fake animation clock (pumpAndSettle never
/// settles while the splash screen's indeterminate spinner is animating, and pumping with fake
/// durations doesn't reliably advance real wall-clock time for an in-flight Future). This test
/// only proves the widget tree builds and the splash screen renders without throwing.
void main() {
  testWidgets('app builds and shows the splash screen without throwing', (tester) async {
    await tester.pumpWidget(const MediConnectApp());
    await tester.pump();

    expect(find.text('MediConnect'), findsWidgets);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
