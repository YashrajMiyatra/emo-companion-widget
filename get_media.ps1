$sessionManagerType = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime]
$manager = [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync().GetAwaiter().GetResult()
$session = $manager.GetCurrentSession()
if ($session) {
    $mediaProps = $session.TryGetMediaPropertiesAsync().GetAwaiter().GetResult()
    Write-Output ($mediaProps.Artist + " - " + $mediaProps.Title)
} else {
    Write-Output "NONE"
}
